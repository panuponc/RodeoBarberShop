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

    [HttpGet("today")]
    public async Task<ActionResult<IReadOnlyList<QueueBookingResponse>>> GetTodayQueue(CancellationToken cancellationToken)
    {
        var (dayStartUtc, dayEndUtc) = GetShopDayRangeUtc(DateOnly.FromDateTime(DateTimeOffset.UtcNow.ToOffset(ShopUtcOffset).Date));

        var bookings = await QueueBookingQuery()
            .Where(booking => booking.StartAt >= dayStartUtc && booking.StartAt < dayEndUtc)
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

        var validationError = ValidateStatusTransition(booking.BookingStatus, newStatus);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var now = DateTimeOffset.UtcNow;
        var oldStatus = booking.BookingStatus;

        booking.BookingStatus = newStatus;
        booking.UpdatedAt = now;

        if (newStatus == BookingStatus.WaitingService)
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

    private IQueryable<Booking> QueueBookingQuery()
    {
        return dbContext.Bookings
            .Include(booking => booking.Customer)
            .Include(booking => booking.Barber)
            .ThenInclude(barber => barber!.User)
            .Include(booking => booking.BookingServices);
    }

    private static QueueBookingResponse ToResponse(Booking booking)
    {
        return new QueueBookingResponse(
            booking.Id,
            booking.BookingNumber,
            booking.CustomerId,
            booking.Customer?.FullName,
            booking.BarberId,
            booking.Barber?.User.FullName,
            booking.StartAt,
            booking.EndAt,
            booking.EstimatedDurationMinutes,
            booking.TotalAmount,
            booking.BookingStatus.ToString(),
            booking.PaymentStatus.ToString(),
            booking.BookingServices
                .OrderBy(bookingService => bookingService.ServiceName)
                .Select(bookingService => new QueueBookingServiceResponse(
                    bookingService.ServiceId,
                    bookingService.ServiceName,
                    bookingService.UnitPrice,
                    bookingService.DurationMinutes,
                    bookingService.Quantity,
                    bookingService.LineTotal))
                .ToList());
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
            BookingStatus.Confirmed => newStatus is BookingStatus.WaitingService or BookingStatus.Cancelled or BookingStatus.NoShow,
            BookingStatus.WaitingService => newStatus is BookingStatus.InService or BookingStatus.Cancelled or BookingStatus.NoShow,
            BookingStatus.InService => newStatus is BookingStatus.WaitingPayment or BookingStatus.Cancelled,
            BookingStatus.WaitingPayment => newStatus is BookingStatus.Completed or BookingStatus.Cancelled,
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
