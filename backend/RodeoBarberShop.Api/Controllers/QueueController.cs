using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Queue;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Controllers;

[ApiController]
[Route("api/queue")]
[Authorize(Roles = "FrontDeskStaff,Barber,Owner,Admin")]
public class QueueController(ApplicationDbContext dbContext) : ControllerBase
{
    private static readonly TimeSpan ShopUtcOffset = TimeSpan.FromHours(7);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<QueueBookingResponse>>> GetQueue(
        [FromQuery] DateOnly? date,
        CancellationToken cancellationToken)
    {
        var targetDate = date ?? DateOnly.FromDateTime(DateTimeOffset.UtcNow.ToOffset(ShopUtcOffset).Date);
        var bookings = await GetQueueForDate(targetDate)
            .ToListAsync(cancellationToken);

        return Ok(bookings);
    }

    [HttpGet("today")]
    public async Task<ActionResult<IReadOnlyList<QueueBookingResponse>>> GetTodayQueue(CancellationToken cancellationToken)
    {
        var bookings = await GetQueueForDate(DateOnly.FromDateTime(DateTimeOffset.UtcNow.ToOffset(ShopUtcOffset).Date))
            .ToListAsync(cancellationToken);

        return Ok(bookings);
    }

    [HttpGet("me")]
    [Authorize(Roles = "Barber")]
    public async Task<ActionResult<IReadOnlyList<QueueBookingResponse>>> GetMyQueue(
        [FromQuery] DateOnly? date,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId is null)
        {
            return Unauthorized();
        }

        var barberProfileId = await dbContext.BarberProfiles
            .Where(profile => profile.UserId == currentUserId.Value)
            .Select(profile => (Guid?)profile.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (barberProfileId is null)
        {
            return Forbid();
        }

        var targetDate = date ?? DateOnly.FromDateTime(DateTimeOffset.UtcNow.ToOffset(ShopUtcOffset).Date);
        var (dayStartUtc, dayEndUtc) = GetShopDayRangeUtc(targetDate);

        var bookings = await QueueBookingQuery()
            .Where(booking => booking.BarberId == barberProfileId.Value
                && booking.StartAt >= dayStartUtc
                && booking.StartAt < dayEndUtc)
            .OrderBy(booking => booking.StartAt)
            .Select(booking => ToResponse(booking))
            .ToListAsync(cancellationToken);

        return Ok(bookings);
    }

    [HttpGet("barber/{barberId:guid}/today")]
    public async Task<ActionResult<IReadOnlyList<QueueBookingResponse>>> GetBarberTodayQueue(
        Guid barberId,
        CancellationToken cancellationToken)
    {
        var (dayStartUtc, dayEndUtc) = GetShopDayRangeUtc(DateOnly.FromDateTime(DateTimeOffset.UtcNow.ToOffset(ShopUtcOffset).Date));

        var bookings = await QueueBookingQuery()
            .Where(booking => booking.BarberId == barberId
                && booking.StartAt >= dayStartUtc
                && booking.StartAt < dayEndUtc)
            .OrderBy(booking => booking.StartAt)
            .Select(booking => ToResponse(booking))
            .ToListAsync(cancellationToken);

        return Ok(bookings);
    }

    [HttpPut("{bookingId:guid}/status")]
    public async Task<ActionResult<UpdateQueueStatusResponse>> UpdateStatus(
        Guid bookingId,
        UpdateQueueStatusRequest request,
        CancellationToken cancellationToken)
    {
        if (!Enum.TryParse<BookingStatus>(request.Status, ignoreCase: true, out var newStatus))
        {
            return BadRequest(new { message = "Status is invalid." });
        }

        var booking = await QueueBookingQuery()
            .FirstOrDefaultAsync(booking => booking.Id == bookingId, cancellationToken);

        if (booking is null)
        {
            return NotFound();
        }

        if (User.IsInRole(UserRole.Barber.ToString()))
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId is null || booking.Barber?.UserId != currentUserId.Value)
            {
                return Forbid();
            }

            if (newStatus == BookingStatus.Completed)
            {
                return BadRequest(new { message = "Confirm payment to complete this booking." });
            }
        }

        var validationError = ValidateStatusTransition(booking.BookingStatus, newStatus);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var now = DateTimeOffset.UtcNow;
        var oldStatus = booking.BookingStatus;

        booking.BookingStatus = newStatus;
        booking.UpdatedAt = now;

        if (newStatus == BookingStatus.Confirmed || newStatus == BookingStatus.WaitingService)
        {
            booking.CheckedInAt ??= now;
        }
        else if (newStatus == BookingStatus.InService)
        {
            booking.ServiceStartedAt ??= now;
        }
        else if (newStatus == BookingStatus.WaitingPayment)
        {
            booking.ServiceCompletedAt ??= now;
        }
        else if (newStatus == BookingStatus.Completed)
        {
            booking.ServiceCompletedAt ??= now;
        }

        if (newStatus == BookingStatus.PendingConfirmation)
        {
            booking.CheckedInAt = null;
            booking.ServiceStartedAt = null;
            booking.ServiceCompletedAt = null;
        }
        else if (newStatus == BookingStatus.Confirmed || newStatus == BookingStatus.WaitingService)
        {
            booking.ServiceStartedAt = null;
            booking.ServiceCompletedAt = null;
        }
        else if (newStatus == BookingStatus.InService)
        {
            booking.ServiceCompletedAt = null;
        }

        var queueEvent = new QueueEvent
        {
            Id = Guid.NewGuid(),
            BookingId = booking.Id,
            FromStatus = oldStatus,
            ToStatus = newStatus,
            ChangedByUserId = GetCurrentUserId(),
            Note = NormalizeOptionalText(request.Note),
            CreatedAt = now
        };

        dbContext.QueueEvents.Add(queueEvent);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new UpdateQueueStatusResponse(ToResponse(booking), ToResponse(queueEvent)));
    }

    [HttpPost("{bookingId:guid}/services")]
    [Authorize(Roles = "Barber")]
    public async Task<ActionResult<QueueBookingResponse>> AddServices(Guid bookingId, AddQueueServicesRequest request, CancellationToken cancellationToken)
    {
        if (request.ServiceIds is not { Count: > 0 and <= 20 } || request.ServiceIds.Distinct().Count() != request.ServiceIds.Count)
            return BadRequest(new { message = "เลือกบริการเพิ่มอย่างน้อย 1 รายการ และไม่ซ้ำกัน" });

        await using var transaction = await BookingWriteLock.BeginAsync(dbContext, cancellationToken);
        var booking = await QueueBookingQuery().FirstOrDefaultAsync(b => b.Id == bookingId, cancellationToken);
        if (booking is null) return NotFound();
        if (!User.IsInRole("Barber") || GetCurrentUserId() is not Guid userId || booking.Barber?.UserId != userId)
            return Forbid();
        if (booking.BookingStatus != BookingStatus.InService || booking.PaymentStatus != PaymentStatus.Unpaid)
            return Conflict(new { message = "เพิ่มบริการได้เฉพาะคิวที่กำลังให้บริการและยังไม่ชำระเงิน" });
        if (booking.EndAt != request.ExpectedEndAt || booking.TotalAmount != request.ExpectedTotalAmount)
            return Conflict(new { message = "ข้อมูลคิวเปลี่ยนแล้ว กรุณาปิดรายละเอียดและรีเฟรชก่อนลองใหม่" });
        if (booking.BookingServices.Any(s => request.ServiceIds.Contains(s.ServiceId)))
            return Conflict(new { message = "มีบริการนี้ในคิวแล้ว กรุณารีเฟรชเพื่อตรวจสอบ" });
        var services = await dbContext.Services.Where(s => request.ServiceIds.Contains(s.Id) && s.IsActive).ToListAsync(cancellationToken);
        if (services.Count != request.ServiceIds.Count)
            return BadRequest(new { message = "บางบริการปิดใช้งานแล้ว กรุณาเลือกใหม่" });
        var allowed = await dbContext.BarberServices.Where(s => s.BarberId == booking.BarberId).Select(s => s.ServiceId).ToListAsync(cancellationToken);
        if (allowed.Count > 0 && services.Any(s => !allowed.Contains(s.Id)))
            return BadRequest(new { message = "ช่างไม่รองรับบริการที่เลือก" });
        var addedAmount = services.Sum(s => s.Price);
        if (addedAmount != request.ExpectedAddedAmount)
            return Conflict(new { message = "ราคาบริการเปลี่ยนแล้ว กรุณาปิดและเปิดรายการบริการใหม่" });
        var duration = services.Sum(s => s.DurationMinutes);
        if (duration != request.ExpectedAddedMinutes)
            return Conflict(new { message = "ระยะเวลาบริการเปลี่ยนแล้ว กรุณาปิดและเปิดรายการบริการใหม่" });
        var end = booking.EndAt.AddMinutes(duration);
        if (await dbContext.LeaveRequests.AnyAsync(l => l.BarberId == booking.BarberId && (l.Status == LeaveStatus.Approved || l.Status == LeaveStatus.CancellationPending) && l.StartAt < end && l.EndAt > booking.EndAt, cancellationToken))
            return Conflict(new { message = "เวลาเพิ่มทับช่วงลาที่อนุมัติแล้ว" });
        var localStart = booking.StartAt.ToOffset(ShopUtcOffset);
        var localEnd = end.ToOffset(ShopUtcOffset);
        var hours = await dbContext.BarberWorkingHours.FirstOrDefaultAsync(h => h.BarberId == booking.BarberId && h.DayOfWeek == (int)localStart.DayOfWeek && h.IsWorkingDay, cancellationToken);
        if (hours is null || localStart.Date != localEnd.Date || localEnd.TimeOfDay > hours.EndTime.ToTimeSpan())
            return Conflict(new { message = "เวลาเพิ่มเกินเวลางานของช่าง ไม่สามารถเพิ่มบริการนี้ได้" });

        var resourceIds = new List<Guid> { booking.BarberId!.Value };
        if (booking.Barber.User.FullName is "ช่างนุค" or "ช่างนุ้ย")
            resourceIds = await dbContext.BarberProfiles.Where(b => b.User.FullName == "ช่างนุค" || b.User.FullName == "ช่างนุ้ย").Select(b => b.Id).ToListAsync(cancellationToken);
        var overlaps = await dbContext.Bookings.AnyAsync(b => b.Id != booking.Id && b.BarberId.HasValue && resourceIds.Contains(b.BarberId.Value)
            && b.BookingStatus != BookingStatus.Cancelled && b.BookingStatus != BookingStatus.NoShow && b.BookingStatus != BookingStatus.Completed
            && b.StartAt < end && b.EndAt > booking.StartAt, cancellationToken);
        if (overlaps) return Conflict(new { message = "เวลาเพิ่มชนกับคิวอื่น กรุณาเลือกบริการที่ใช้เวลาน้อยลง" });

        var now = DateTimeOffset.UtcNow;
        foreach (var service in services)
        {
            var added = new BookingService { Id = Guid.NewGuid(), BookingId = booking.Id, ServiceId = service.Id, ServiceName = service.Name, UnitPrice = service.Price, DurationMinutes = service.DurationMinutes, Quantity = 1, LineTotal = service.Price, AddedDuringService = true, AddedByUserId = userId, CreatedAt = now };
            booking.BookingServices.Add(added);
            dbContext.BookingServices.Add(added);
        }
        booking.EndAt = end;
        booking.EstimatedDurationMinutes += duration;
        booking.SubtotalAmount += addedAmount;
        booking.TotalAmount = booking.SubtotalAmount - booking.DiscountAmount;
        booking.UpdatedAt = now;
        dbContext.QueueEvents.Add(new QueueEvent { Id = Guid.NewGuid(), BookingId = booking.Id, FromStatus = booking.BookingStatus, ToStatus = booking.BookingStatus, ChangedByUserId = userId, Note = $"Added services: {string.Join(", ", services.Select(s => s.Name))}; +{duration} min; +{addedAmount:0.00}", CreatedAt = now });
        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return Ok(ToResponse(booking));
    }

    private IQueryable<Booking> QueueBookingQuery()
    {
        return dbContext.Bookings
            .Include(booking => booking.Customer)
            .Include(booking => booking.Barber)
            .ThenInclude(barber => barber!.User)
            .Include(booking => booking.BookingServices);
    }

    private IQueryable<QueueBookingResponse> GetQueueForDate(DateOnly date)
    {
        var (dayStartUtc, dayEndUtc) = GetShopDayRangeUtc(date);

        return QueueBookingQuery()
            .Where(booking => booking.StartAt >= dayStartUtc && booking.StartAt < dayEndUtc)
            .OrderBy(booking => booking.StartAt)
            .Select(booking => ToResponse(booking));
    }

    private static QueueBookingResponse ToResponse(Booking booking)
    {
        return new QueueBookingResponse(
            booking.Id,
            booking.BookingNumber,
            booking.CustomerId,
            booking.Customer?.FullName ?? booking.GuestName,
            booking.BarberId,
            booking.Barber?.User.FullName,
            booking.StartAt,
            booking.EndAt,
            booking.EstimatedDurationMinutes,
            booking.TotalAmount,
            booking.BookingStatus.ToString(),
            booking.PaymentStatus.ToString(),
            booking.CancelReason,
            booking.CancelledAt,
            booking.BookingServices
                .OrderBy(bookingService => bookingService.AddedDuringService)
                .ThenBy(bookingService => bookingService.CreatedAt)
                .ThenBy(bookingService => bookingService.ServiceName)
                .Select(bookingService => new QueueBookingServiceResponse(
                    bookingService.ServiceId,
                    bookingService.ServiceName,
                    bookingService.UnitPrice,
                    bookingService.DurationMinutes,
                    bookingService.Quantity,
                    bookingService.LineTotal,
                    bookingService.AddedDuringService,
                    bookingService.CreatedAt))
                .ToList(),
            booking.Customer is not null ? booking.Customer.PhoneNumber : booking.GuestPhoneNumber);
    }

    private static QueueEventResponse ToResponse(QueueEvent queueEvent)
    {
        return new QueueEventResponse(
            queueEvent.Id,
            queueEvent.BookingId,
            queueEvent.FromStatus?.ToString(),
            queueEvent.ToStatus.ToString(),
            queueEvent.ChangedByUserId,
            queueEvent.Note,
            queueEvent.CreatedAt);
    }

    private static string? ValidateStatusTransition(BookingStatus oldStatus, BookingStatus newStatus)
    {
        if (oldStatus == newStatus)
        {
            return null;
        }

        if (oldStatus is BookingStatus.Cancelled or BookingStatus.Completed or BookingStatus.NoShow)
        {
            return "Final booking status cannot be changed.";
        }

        var isValid = oldStatus switch
        {
            BookingStatus.PendingConfirmation => newStatus is BookingStatus.Confirmed or BookingStatus.Cancelled or BookingStatus.NoShow,
            BookingStatus.Confirmed => newStatus is BookingStatus.PendingConfirmation or BookingStatus.InService or BookingStatus.NoShow,
            BookingStatus.WaitingService => newStatus is BookingStatus.Confirmed or BookingStatus.InService or BookingStatus.NoShow,
            BookingStatus.InService => newStatus is BookingStatus.Confirmed or BookingStatus.WaitingService or BookingStatus.WaitingPayment,
            BookingStatus.WaitingPayment => newStatus is BookingStatus.InService or BookingStatus.Completed,
            _ => false
        };

        return isValid ? null : $"Cannot change status from {oldStatus} to {newStatus}.";
    }

    private static (DateTimeOffset DayStartUtc, DateTimeOffset DayEndUtc) GetShopDayRangeUtc(DateOnly date)
    {
        var dayStart = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue), ShopUtcOffset);
        var dayEnd = dayStart.AddDays(1);

        return (dayStart.ToUniversalTime(), dayEnd.ToUniversalTime());
    }

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(userId, out var parsedUserId) ? parsedUserId : null;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
