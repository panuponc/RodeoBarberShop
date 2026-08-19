using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
    [Authorize(Roles = "FrontDeskStaff,Owner,Admin")]
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

        var paymentAccount = await GetPaymentAccountForQr(null, cancellationToken);
        var qr = paymentAccount is null
            ? null
            : thaiQrPaymentService.CreatePromptPayQr(paymentAccount, booking.TotalAmount);

        return Ok(ToSummaryResponse(booking, paymentAccount, qr));
    }

    [Authorize(Roles = "FrontDeskStaff,Owner,Admin")]
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

        if (!Enum.TryParse<PaymentMethod>(request.PaymentMethod, ignoreCase: true, out var paymentMethod))
        {
            return BadRequest(new { message = "Payment method is invalid." });
        }

        var booking = await PaymentBookingQuery()
            .FirstOrDefaultAsync(booking => booking.Id == request.BookingId, cancellationToken);

        if (booking is null)
        {
            return NotFound();
        }

        if (booking.Payment is not null && booking.Payment.PaymentStatus == PaymentStatus.Paid)
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
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await PaymentQuery()
            .Where(existingPayment => existingPayment.Id == payment.Id)
            .Select(existingPayment => ToResponse(existingPayment))
            .FirstAsync(cancellationToken);

        return CreatedAtAction(nameof(GetPayment), new { id = payment.Id }, response);
    }

    [Authorize(Roles = "Customer,FrontDeskStaff,Owner,Admin")]
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

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(payment));
    }

    [Authorize(Roles = "Customer,FrontDeskStaff,Owner,Admin")]
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

        var shop = await dbContext.ShopSettings
            .AsNoTracking()
            .OrderBy(setting => setting.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        return Ok(ToReceiptResponse(payment, shop));
    }

    [Authorize(Roles = "Customer,FrontDeskStaff,Owner,Admin")]
    [HttpGet("booking/{bookingId:guid}/receipt")]
    public async Task<ActionResult<ReceiptResponse>> GetBookingReceipt(Guid bookingId, CancellationToken cancellationToken)
    {
        var payment = await PaymentQuery()
            .FirstOrDefaultAsync(payment => payment.BookingId == bookingId, cancellationToken);

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
            .Include(booking => booking.Payment);
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
        if (User.IsInRole(UserRole.FrontDeskStaff.ToString())
            || User.IsInRole(UserRole.Owner.ToString())
            || User.IsInRole(UserRole.Admin.ToString()))
        {
            return true;
        }

        var currentUserId = GetCurrentUserId();

        return currentUserId is not null && payment.Booking.CustomerId == currentUserId.Value;
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

    private static ReceiptResponse ToReceiptResponse(Payment payment, ShopSetting? shop)
    {
        return new ReceiptResponse(
            payment.Id,
            payment.PaymentNumber,
            payment.Booking.BookingNumber,
            shop?.ShopName ?? "Rodeo Barber Shop",
            shop?.Address,
            shop?.PhoneNumber,
            payment.Booking.Customer?.FullName,
            payment.Booking.Barber?.User.FullName,
            payment.PaidAt,
            payment.PaymentMethod.ToString(),
            payment.SubtotalAmount,
            payment.DiscountAmount,
            payment.TotalAmount,
            payment.Booking.BookingServices
                .OrderBy(bookingService => bookingService.ServiceName)
                .Select(ToServiceResponse)
                .ToList());
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
