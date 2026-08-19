using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Bookings;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BookingsController(ApplicationDbContext dbContext) : ControllerBase
{
    private static readonly TimeSpan ShopUtcOffset = TimeSpan.FromHours(7);

    private static readonly BookingStatus[] ActiveBookingStatuses =
    [
        BookingStatus.PendingConfirmation,
        BookingStatus.Confirmed,
        BookingStatus.WaitingService,
        BookingStatus.InService,
        BookingStatus.WaitingPayment
    ];

    [Authorize(Roles = "Customer")]
    [HttpPost]
    public async Task<ActionResult<BookingResponse>> CreateBooking(
        CreateBookingRequest request,
        CancellationToken cancellationToken)
    {
        var customerId = GetCurrentUserId();
        if (customerId is null)
        {
            return Unauthorized();
        }

        var validationError = ValidateCreateBookingRequest(request);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var selectedServices = await dbContext.Services
            .Where(service => request.ServiceIds.Contains(service.Id) && service.IsActive)
            .ToListAsync(cancellationToken);

        if (selectedServices.Count != request.ServiceIds.Distinct().Count())
        {
            return BadRequest(new { message = "Every service id must refer to an active service." });
        }

        var barber = await dbContext.BarberProfiles
            .Include(barber => barber.User)
            .Include(barber => barber.BarberServices)
            .FirstOrDefaultAsync(
                barber => barber.Id == request.BarberId
                    && barber.User.AccountStatus == AccountStatus.Active
                    && barber.IsAvailable
                    && barber.AcceptsBooking,
                cancellationToken);

        if (barber is null)
        {
            return BadRequest(new { message = "Selected barber is not available for booking." });
        }

        var barberServiceIds = barber.BarberServices.Select(barberService => barberService.ServiceId).ToHashSet();
        if (barberServiceIds.Count > 0 && selectedServices.Any(service => !barberServiceIds.Contains(service.Id)))
        {
            return BadRequest(new { message = "Selected barber cannot perform one or more selected services." });
        }

        var durationMinutes = selectedServices.Sum(service => service.DurationMinutes);
        var startAtUtc = request.StartAt.ToUniversalTime();
        var endAtUtc = startAtUtc.AddMinutes(durationMinutes);

        var availabilityError = await ValidateBookingAvailability(
            barber.Id,
            request.StartAt,
            startAtUtc,
            endAtUtc,
            cancellationToken);

        if (availabilityError is not null)
        {
            return BadRequest(new { message = availabilityError });
        }

        var now = DateTimeOffset.UtcNow;
        var subtotalAmount = selectedServices.Sum(service => service.Price);
        var booking = new Booking
        {
            Id = Guid.NewGuid(),
            BookingNumber = GenerateBookingNumber(now),
            BookingSource = BookingSource.Online,
            CustomerId = customerId.Value,
            BarberId = barber.Id,
            StartAt = startAtUtc,
            EndAt = endAtUtc,
            EstimatedDurationMinutes = durationMinutes,
            SubtotalAmount = subtotalAmount,
            DiscountAmount = 0,
            TotalAmount = subtotalAmount,
            BookingStatus = BookingStatus.PendingConfirmation,
            PaymentStatus = PaymentStatus.Unpaid,
            CustomerNote = NormalizeOptionalText(request.CustomerNote),
            CreatedAt = now,
            UpdatedAt = now
        };

        foreach (var service in selectedServices.OrderBy(service => service.Name))
        {
            booking.BookingServices.Add(new BookingService
            {
                Id = Guid.NewGuid(),
                ServiceId = service.Id,
                ServiceName = service.Name,
                UnitPrice = service.Price,
                DurationMinutes = service.DurationMinutes,
                Quantity = 1,
                LineTotal = service.Price,
                AddedDuringService = false,
                CreatedAt = now
            });
        }

        dbContext.Bookings.Add(booking);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await BookingResponseQuery()
            .Where(existingBooking => existingBooking.Id == booking.Id)
            .Select(existingBooking => ToResponse(existingBooking))
            .FirstAsync(cancellationToken);

        return CreatedAtAction(nameof(GetBooking), new { id = booking.Id }, response);
    }

    [Authorize(Roles = "Customer")]
    [HttpGet("my")]
    public async Task<ActionResult<IReadOnlyList<BookingResponse>>> GetMyBookings(CancellationToken cancellationToken)
    {
        var customerId = GetCurrentUserId();
        if (customerId is null)
        {
            return Unauthorized();
        }

        var bookings = await BookingResponseQuery()
            .Where(booking => booking.CustomerId == customerId.Value)
            .OrderByDescending(booking => booking.StartAt)
            .Select(booking => ToResponse(booking))
            .ToListAsync(cancellationToken);

        return Ok(bookings);
    }

    [Authorize]
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BookingResponse>> GetBooking(Guid id, CancellationToken cancellationToken)
    {
        var booking = await BookingResponseQuery()
            .Where(booking => booking.Id == id)
            .FirstOrDefaultAsync(cancellationToken);

        if (booking is null)
        {
            return NotFound();
        }

        if (!CanAccessBooking(booking))
        {
            return Forbid();
        }

        return Ok(ToResponse(booking));
    }

    [Authorize(Roles = "Customer,FrontDeskStaff,Owner,Admin")]
    [HttpPost("{id:guid}/cancel")]
    public async Task<ActionResult<BookingResponse>> CancelBooking(
        Guid id,
        CancelBookingRequest request,
        CancellationToken cancellationToken)
    {
        var booking = await BookingResponseQuery()
            .FirstOrDefaultAsync(booking => booking.Id == id, cancellationToken);

        if (booking is null)
        {
            return NotFound();
        }

        if (!CanAccessBooking(booking))
        {
            return Forbid();
        }

        if (booking.BookingStatus is BookingStatus.Completed or BookingStatus.Cancelled or BookingStatus.NoShow)
        {
            return BadRequest(new { message = "Booking cannot be cancelled in its current status." });
        }

        booking.BookingStatus = BookingStatus.Cancelled;
        booking.CancelReason = NormalizeOptionalText(request.Reason);
        booking.CancelledAt = DateTimeOffset.UtcNow;
        booking.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(booking));
    }

    [HttpGet("availability")]
    public async Task<ActionResult<IReadOnlyList<AvailabilitySlotResponse>>> GetAvailability(
        [FromQuery] Guid barberId,
        [FromQuery] DateOnly date,
        [FromQuery] List<Guid> serviceIds,
        CancellationToken cancellationToken)
    {
        if (barberId == Guid.Empty || serviceIds.Count == 0)
        {
            return BadRequest(new { message = "barberId and at least one serviceIds value are required." });
        }

        var selectedServices = await dbContext.Services
            .Where(service => serviceIds.Contains(service.Id) && service.IsActive)
            .ToListAsync(cancellationToken);

        if (selectedServices.Count != serviceIds.Distinct().Count())
        {
            return BadRequest(new { message = "Every service id must refer to an active service." });
        }

        var durationMinutes = selectedServices.Sum(service => service.DurationMinutes);
        var slotIntervalMinutes = await dbContext.ShopSettings
            .OrderBy(setting => setting.CreatedAt)
            .Select(setting => setting.SlotIntervalMinutes)
            .FirstOrDefaultAsync(cancellationToken);

        if (slotIntervalMinutes <= 0)
        {
            slotIntervalMinutes = 30;
        }

        var workingHour = await dbContext.BarberWorkingHours
            .AsNoTracking()
            .FirstOrDefaultAsync(
                workingHour => workingHour.BarberId == barberId
                    && workingHour.DayOfWeek == (int)date.DayOfWeek
                    && workingHour.IsWorkingDay,
                cancellationToken);

        if (workingHour is null)
        {
            return Ok(Array.Empty<AvailabilitySlotResponse>());
        }

        if (await IsShopHoliday(date, cancellationToken))
        {
            return Ok(Array.Empty<AvailabilitySlotResponse>());
        }

        var dayStart = new DateTimeOffset(date.ToDateTime(workingHour.StartTime), ShopUtcOffset);
        var dayEnd = new DateTimeOffset(date.ToDateTime(workingHour.EndTime), ShopUtcOffset);
        var dayStartUtc = dayStart.ToUniversalTime();
        var dayEndUtc = dayEnd.ToUniversalTime();
        var existingBookings = await dbContext.Bookings
            .AsNoTracking()
            .Where(booking => booking.BarberId == barberId
                && ActiveBookingStatuses.Contains(booking.BookingStatus)
                && booking.StartAt < dayEndUtc
                && booking.EndAt > dayStartUtc)
            .Select(booking => new { booking.StartAt, booking.EndAt })
            .ToListAsync(cancellationToken);

        var slots = new List<AvailabilitySlotResponse>();
        for (var startAt = dayStart; startAt.AddMinutes(durationMinutes) <= dayEnd; startAt = startAt.AddMinutes(slotIntervalMinutes))
        {
            var endAt = startAt.AddMinutes(durationMinutes);
            var overlaps = existingBookings.Any(booking => startAt < booking.EndAt && endAt > booking.StartAt);

            slots.Add(new AvailabilitySlotResponse(startAt, endAt, !overlaps));
        }

        return Ok(slots);
    }

    private IQueryable<Booking> BookingResponseQuery()
    {
        return dbContext.Bookings
            .Include(booking => booking.Customer)
            .Include(booking => booking.Barber)
            .ThenInclude(barber => barber!.User)
            .Include(booking => booking.BookingServices);
    }

    private async Task<string?> ValidateBookingAvailability(
        Guid barberId,
        DateTimeOffset requestedStartAt,
        DateTimeOffset startAtUtc,
        DateTimeOffset endAtUtc,
        CancellationToken cancellationToken)
    {
        if (startAtUtc <= DateTimeOffset.UtcNow)
        {
            return "Booking start time must be in the future.";
        }

        var requestedEndAt = requestedStartAt.Add(endAtUtc - startAtUtc);
        var bookingDate = DateOnly.FromDateTime(requestedStartAt.DateTime);
        if (await IsShopHoliday(bookingDate, cancellationToken))
        {
            return "Selected date is a shop holiday.";
        }

        var workingHour = await dbContext.BarberWorkingHours
            .AsNoTracking()
            .FirstOrDefaultAsync(
                workingHour => workingHour.BarberId == barberId
                    && workingHour.DayOfWeek == (int)requestedStartAt.DayOfWeek
                    && workingHour.IsWorkingDay,
                cancellationToken);

        if (workingHour is null)
        {
            return "Selected barber is not working at the selected date.";
        }

        if (requestedStartAt.TimeOfDay < workingHour.StartTime.ToTimeSpan()
            || requestedEndAt.TimeOfDay > workingHour.EndTime.ToTimeSpan())
        {
            return "Selected time is outside barber working hours.";
        }

        var overlaps = await dbContext.Bookings
            .AnyAsync(
                booking => booking.BarberId == barberId
                    && ActiveBookingStatuses.Contains(booking.BookingStatus)
                    && startAtUtc < booking.EndAt
                    && endAtUtc > booking.StartAt,
                cancellationToken);

        return overlaps ? "Selected time overlaps another booking." : null;
    }

    private async Task<bool> IsShopHoliday(DateOnly date, CancellationToken cancellationToken)
    {
        return await dbContext.ShopHolidays
            .AsNoTracking()
            .AnyAsync(
                holiday => (holiday.HolidayType == HolidayType.Weekly && holiday.DayOfWeek == (int)date.DayOfWeek)
                    || (holiday.HolidayType == HolidayType.Special && holiday.HolidayDate == date),
                cancellationToken);
    }

    private bool CanAccessBooking(Booking booking)
    {
        if (User.IsInRole(UserRole.FrontDeskStaff.ToString())
            || User.IsInRole(UserRole.Owner.ToString())
            || User.IsInRole(UserRole.Admin.ToString()))
        {
            return true;
        }

        var currentUserId = GetCurrentUserId();

        return currentUserId is not null && booking.CustomerId == currentUserId.Value;
    }

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(userId, out var parsedUserId) ? parsedUserId : null;
    }

    private static BookingResponse ToResponse(Booking booking)
    {
        return new BookingResponse(
            booking.Id,
            booking.BookingNumber,
            booking.BookingSource.ToString(),
            booking.CustomerId,
            booking.Customer?.FullName,
            booking.BarberId,
            booking.Barber?.User.FullName,
            booking.StartAt,
            booking.EndAt,
            booking.EstimatedDurationMinutes,
            booking.SubtotalAmount,
            booking.DiscountAmount,
            booking.TotalAmount,
            booking.BookingStatus.ToString(),
            booking.PaymentStatus.ToString(),
            booking.CustomerNote,
            booking.CancelReason,
            booking.BookingServices
                .OrderBy(bookingService => bookingService.ServiceName)
                .Select(bookingService => new BookingServiceResponse(
                    bookingService.ServiceId,
                    bookingService.ServiceName,
                    bookingService.UnitPrice,
                    bookingService.DurationMinutes,
                    bookingService.Quantity,
                    bookingService.LineTotal))
                .ToList(),
            booking.CreatedAt,
            booking.UpdatedAt);
    }

    private static string? ValidateCreateBookingRequest(CreateBookingRequest request)
    {
        if (request.BarberId == Guid.Empty)
        {
            return "Barber id is required.";
        }

        if (request.ServiceIds.Count == 0)
        {
            return "At least one service is required.";
        }

        if (request.ServiceIds.Any(serviceId => serviceId == Guid.Empty))
        {
            return "Service id is required.";
        }

        return null;
    }

    private static string GenerateBookingNumber(DateTimeOffset now)
    {
        return $"RB{now:yyyyMMddHHmmssfff}";
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
