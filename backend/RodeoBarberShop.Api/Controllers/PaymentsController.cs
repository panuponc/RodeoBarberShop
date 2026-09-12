using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RodeoBarberShop.Api.Contracts.Payments;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;
using RodeoBarberShop.Api.Services.Payments;

namespace RodeoBarberShop.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController(
    ApplicationDbContext dbContext,
    IThaiQrPaymentService thaiQrPaymentService) : ControllerBase
{
    [Authorize(Roles = "Barber,FrontDeskStaff,Owner,Admin")]
    [HttpGet("booking/{bookingId:guid}")]
    public async Task<ActionResult<PaymentSummaryResponse>> GetBookingPaymentSummary(
        Guid bookingId,
        CancellationToken cancellationToken)
    {
        var booking = await PaymentBookingQuery()
            .FirstOrDefaultAsync(booking => booking.Id == bookingId, cancellationToken);

        if (booking is null)
        {
            return NotFound();
        }

        if (!CanManageBookingPayment(booking))
        {
            return Forbid();
        }

        if (User.IsInRole(UserRole.Barber.ToString())
            && booking.BookingStatus is not (BookingStatus.WaitingPayment or BookingStatus.Completed))
        {
            return BadRequest(new { message = "Complete the service before collecting payment." });
        }

        var paymentAccount = await GetPaymentAccountForQr(null, cancellationToken);
        var qr = paymentAccount is null || booking.PaymentStatus == PaymentStatus.Paid
            ? null
            : thaiQrPaymentService.CreatePromptPayQr(paymentAccount, booking.TotalAmount);

        return Ok(ToSummaryResponse(booking, paymentAccount, qr));
    }

    [Authorize(Roles = "Barber,FrontDeskStaff,Owner,Admin")]
    [HttpPost]
    public async Task<ActionResult<PaymentResponse>> CreatePayment(
        CreatePaymentRequest request,
        CancellationToken cancellationToken)
    {
        var receivedByUserId = GetCurrentUserId();
        if (receivedByUserId is null)
        {
            return Unauthorized();
        }

        if (!Enum.TryParse<PaymentMethod>(request.PaymentMethod, ignoreCase: true, out var paymentMethod)
            || !Enum.IsDefined(paymentMethod))
        {
            return BadRequest(new { message = "Payment method is invalid." });
        }

        var booking = await PaymentBookingQuery()
            .FirstOrDefaultAsync(booking => booking.Id == request.BookingId, cancellationToken);

        if (booking is null)
        {
            return NotFound();
        }

        if (!CanManageBookingPayment(booking))
        {
            return Forbid();
        }

        if (booking.Payments.Any(payment => payment.PaymentStatus == PaymentStatus.Paid) || booking.PaymentStatus == PaymentStatus.Paid)
        {
            return Conflict(new { message = "Booking has already been paid." });
        }

        if (booking.BookingStatus != BookingStatus.WaitingPayment)
        {
            return BadRequest(new { message = "Booking must be waiting for payment before payment can be confirmed." });
        }

        var paymentAccount = paymentMethod == PaymentMethod.QrPayment
            ? await GetPaymentAccountForQr(request.PaymentAccountId, cancellationToken)
            : null;

        if (paymentMethod == PaymentMethod.QrPayment && paymentAccount is null)
        {
            return BadRequest(new { message = "An active PromptPay payment account is required for QR payment." });
        }

        var now = DateTimeOffset.UtcNow;
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            PaymentAccountId = paymentAccount?.Id,
            PaymentNumber = GeneratePaymentNumber(now),
            PaymentMethod = paymentMethod,
            PaymentStatus = PaymentStatus.Paid,
            SubtotalAmount = booking.SubtotalAmount,
            DiscountAmount = booking.DiscountAmount,
            TotalAmount = booking.TotalAmount,
            PaidAt = now,
            ReceivedByUserId = receivedByUserId.Value,
            Note = NormalizeOptionalText(request.Note),
            CreatedAt = now,
            UpdatedAt = now
        };

        booking.PaymentStatus = PaymentStatus.Paid;
        booking.BookingStatus = BookingStatus.Completed;
        booking.UpdatedAt = now;

        dbContext.Payments.Add(payment);
        dbContext.QueueEvents.Add(new QueueEvent
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            FromStatus = BookingStatus.WaitingPayment,
            ToStatus = BookingStatus.Completed,
            ChangedByUserId = receivedByUserId.Value,
            Note = $"Payment confirmed: {payment.PaymentNumber}",
            CreatedAt = now
        });
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            return Conflict(new { message = "Payment already exists. Refresh the booking before continuing." });
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "Payment status changed. Refresh the booking before continuing." });
        }

        var response = await PaymentQuery()
            .Where(existingPayment => existingPayment.Id == payment.Id)
            .Select(existingPayment => ToResponse(existingPayment))
            .FirstAsync(cancellationToken);

        return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, response);
    }

    [Authorize(Roles = "Barber,Owner,Admin")]
    [HttpPost("{id:guid}/correct")]
    public async Task<ActionResult<PaymentResponse>> CorrectPayment(Guid id, CorrectPaymentRequest request, CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        if (userId is null) return Unauthorized();
        var reason = request.Reason?.Trim();
        if (string.IsNullOrWhiteSpace(reason) || reason.Length < 3 || reason.Length > 500)
            return BadRequest(new { message = "Please provide a correction reason (3-500 characters)." });

        var payment = await PaymentQuery().FirstOrDefaultAsync(payment => payment.Id == id, cancellationToken);
        if (payment is null) return NotFound();
        if (!CanCorrectPayment(payment)) return Forbid();
        if (payment.PaymentStatus != PaymentStatus.Paid || payment.Booking.PaymentStatus != PaymentStatus.Paid
            || payment.Booking.BookingStatus != BookingStatus.Completed)
            return Conflict(new { message = "This payment is no longer available for correction. Refresh the booking." });

        var now = DateTimeOffset.UtcNow;
        payment.PaymentStatus = PaymentStatus.Voided;
        payment.UpdatedAt = now;
        payment.Booking.PaymentStatus = PaymentStatus.Unpaid;
        payment.Booking.BookingStatus = BookingStatus.WaitingPayment;
        payment.Booking.UpdatedAt = now;
        dbContext.QueueEvents.Add(new QueueEvent
        {
            Id = Guid.NewGuid(), BookingId = payment.BookingId,
            FromStatus = BookingStatus.Completed, ToStatus = BookingStatus.WaitingPayment,
            ChangedByUserId = userId.Value, CreatedAt = now,
            Note = System.Text.Json.JsonSerializer.Serialize(new { action = "PaymentCorrection", paymentId = payment.Id, paymentNumber = payment.PaymentNumber, reason })
        });
        try { await dbContext.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "Payment status changed. Refresh the booking before continuing." });
        }
        return Ok(ToResponse(payment));
    }

    [Authorize(Roles = "Customer,Barber,FrontDeskStaff,Owner,Admin")]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PaymentResponse>> GetPayment(Guid id, CancellationToken cancellationToken)
    {
        var payment = await PaymentQuery()
            .FirstOrDefaultAsync(payment => payment.Id == id, cancellationToken);

        if (payment is null)
        {
            return NotFound();
        }

        if (!CanAccessPayment(payment))
        {
            return Forbid();
        }

        return Ok(ToResponse(payment));
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPost("{id:guid}/void")]
    public async Task<ActionResult<PaymentResponse>> VoidPayment(Guid id, CancellationToken cancellationToken)
    {
        var payment = await PaymentQuery()
            .FirstOrDefaultAsync(payment => payment.Id == id, cancellationToken);

        if (payment is null)
        {
            return NotFound();
        }

        if (payment.PaymentStatus != PaymentStatus.Paid)
        {
            return BadRequest(new { message = "Only paid payments can be voided." });
        }

        payment.PaymentStatus = PaymentStatus.Voided;
        payment.UpdatedAt = DateTimeOffset.UtcNow;
        payment.Booking.PaymentStatus = PaymentStatus.Voided;
        payment.Booking.UpdatedAt = DateTimeOffset.UtcNow;

        try { await dbContext.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new { message = "Payment status changed. Refresh the booking before continuing." });
        }

        return Ok(ToResponse(payment));
    }

    [Authorize(Roles = "Customer,Barber,FrontDeskStaff,Owner,Admin")]
    [HttpGet("{id:guid}/receipt")]
    public async Task<ActionResult<ReceiptResponse>> GetReceipt(Guid id, CancellationToken cancellationToken)
    {
        var payment = await PaymentQuery()
            .FirstOrDefaultAsync(payment => payment.Id == id, cancellationToken);

        if (payment is null)
        {
            return NotFound();
        }

        if (!CanAccessPayment(payment))
        {
            return Forbid();
        }

        if (payment.PaymentStatus != PaymentStatus.Paid)
            return Conflict(new { message = "This receipt has been voided and is no longer valid." });

        var shop = await dbContext.ShopSettings
            .AsNoTracking()
            .OrderBy(setting => setting.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        return Ok(ToReceiptResponse(payment, shop));
    }

    [Authorize(Roles = "Customer,Barber,FrontDeskStaff,Owner,Admin")]
    [HttpGet("booking/{bookingId:guid}/receipt")]
    public async Task<ActionResult<ReceiptResponse>> GetBookingReceipt(Guid bookingId, CancellationToken cancellationToken)
    {
        var payment = await PaymentQuery()
            .FirstOrDefaultAsync(payment => payment.BookingId == bookingId && payment.PaymentStatus == PaymentStatus.Paid, cancellationToken);

        if (payment is null)
        {
            return NotFound();
        }

        if (!CanAccessPayment(payment))
        {
            return Forbid();
        }

        var shop = await dbContext.ShopSettings
            .AsNoTracking()
            .OrderBy(setting => setting.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        return Ok(ToReceiptResponse(payment, shop));
    }

    private IQueryable<Booking> PaymentBookingQuery()
    {
        return dbContext.Bookings
            .Include(booking => booking.Customer)
            .Include(booking => booking.Barber)
            .ThenInclude(barber => barber!.User)
            .Include(booking => booking.BookingServices)
            .Include(booking => booking.Payments);
    }

    private IQueryable<Payment> PaymentQuery()
    {
        return dbContext.Payments
            .Include(payment => payment.Booking)
            .ThenInclude(booking => booking.Customer)
            .Include(payment => payment.Booking)
            .ThenInclude(booking => booking.Barber)
            .ThenInclude(barber => barber!.User)
            .Include(payment => payment.Booking)
            .ThenInclude(booking => booking.BookingServices)
            .Include(payment => payment.PaymentAccount);
    }

    private async Task<PaymentAccount?> GetPaymentAccountForQr(Guid? paymentAccountId, CancellationToken cancellationToken)
    {
        var query = dbContext.PaymentAccounts
            .Where(account => account.IsActive
                && (account.AccountType == PaymentAccountType.PromptPayPhone
                    || account.AccountType == PaymentAccountType.PromptPayNationalId));

        if (paymentAccountId is not null)
        {
            return await query.FirstOrDefaultAsync(account => account.Id == paymentAccountId.Value, cancellationToken);
        }

        return await query
            .OrderByDescending(account => account.IsDefault)
            .ThenBy(account => account.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private bool CanAccessPayment(Payment payment)
    {
        if (User.IsInRole(UserRole.Customer.ToString()))
        {
            var currentUserId = GetCurrentUserId();
            return currentUserId is not null && payment.Booking.CustomerId == currentUserId.Value;
        }

        return CanManageBookingPayment(payment.Booking);
    }

    private bool CanManageBookingPayment(Booking booking)
    {
        if (User.IsInRole(UserRole.FrontDeskStaff.ToString())
            || User.IsInRole(UserRole.Owner.ToString())
            || User.IsInRole(UserRole.Admin.ToString()))
        {
            return true;
        }

        var currentUserId = GetCurrentUserId();

        return User.IsInRole(UserRole.Barber.ToString())
            && currentUserId is not null
            && booking.Barber?.UserId == currentUserId.Value;
    }

    private bool CanCorrectPayment(Payment payment)
    {
        return User.IsInRole(UserRole.Owner.ToString()) || User.IsInRole(UserRole.Admin.ToString())
            || (User.IsInRole(UserRole.Barber.ToString()) && CanManageBookingPayment(payment.Booking)
                && GetCurrentUserId() == payment.ReceivedByUserId);
    }

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(userId, out var parsedUserId) ? parsedUserId : null;
    }

    private static PaymentSummaryResponse ToSummaryResponse(Booking booking, PaymentAccount? paymentAccount, QrPaymentResult? qr)
    {
        return new PaymentSummaryResponse(
            booking.Id,
            booking.BookingNumber,
            booking.BookingStatus.ToString(),
            booking.PaymentStatus.ToString(),
            booking.SubtotalAmount,
            booking.DiscountAmount,
            booking.TotalAmount,
            paymentAccount is null ? null : ToSummaryResponse(paymentAccount),
            qr?.Payload,
            qr?.ImageDataUrl,
            booking.BookingServices
                .OrderBy(bookingService => bookingService.ServiceName)
                .Select(ToServiceResponse)
                .ToList());
    }

    private static PaymentAccountSummaryResponse ToSummaryResponse(PaymentAccount paymentAccount)
    {
        return new PaymentAccountSummaryResponse(
            paymentAccount.Id,
            paymentAccount.AccountName,
            paymentAccount.AccountType.ToString(),
            paymentAccount.AccountNumber,
            paymentAccount.BankName);
    }

    private static PaymentResponse ToResponse(Payment payment)
    {
        return new PaymentResponse(
            payment.Id,
            payment.BookingId,
            payment.Booking.BookingNumber,
            payment.PaymentAccountId,
            payment.PaymentNumber,
            payment.PaymentMethod.ToString(),
            payment.PaymentStatus.ToString(),
            payment.SubtotalAmount,
            payment.DiscountAmount,
            payment.TotalAmount,
            payment.PaidAt,
            payment.ReceivedByUserId,
            payment.Note,
            payment.CreatedAt,
            payment.UpdatedAt);
    }

    private ReceiptResponse ToReceiptResponse(Payment payment, ShopSetting? shop)
    {
        return new ReceiptResponse(
            payment.Id,
            payment.PaymentNumber,
            payment.Booking.BookingNumber,
            shop?.ShopName ?? "Rodeo Barber Shop",
            shop?.Address,
            shop?.PhoneNumber,
            payment.Booking.Customer?.FullName ?? payment.Booking.GuestName,
            payment.Booking.Barber?.User.FullName,
            payment.PaidAt,
            payment.PaymentMethod.ToString(),
            payment.SubtotalAmount,
            payment.DiscountAmount,
            payment.TotalAmount,
            payment.Booking.BookingServices
                .OrderBy(bookingService => bookingService.ServiceName)
                .Select(ToServiceResponse)
                .ToList(),
            CanCorrectPayment(payment) && payment.PaymentStatus == PaymentStatus.Paid && payment.Booking.BookingStatus == BookingStatus.Completed);
    }

    private static PaymentBookingServiceResponse ToServiceResponse(BookingService bookingService)
    {
        return new PaymentBookingServiceResponse(
            bookingService.ServiceId,
            bookingService.ServiceName,
            bookingService.UnitPrice,
            bookingService.DurationMinutes,
            bookingService.Quantity,
            bookingService.LineTotal);
    }

    private static string GeneratePaymentNumber(DateTimeOffset now)
    {
        return $"PM{now:yyyyMMddHHmmssfff}";
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
