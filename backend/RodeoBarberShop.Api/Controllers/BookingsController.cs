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
public class BookingsController(ApplicationDbContext dbContext, TimeProvider? timeProvider = null) : ControllerBase
{
    private static readonly TimeSpan ShopUtcOffset = TimeSpan.FromHours(7);
    private const int BookingStartIntervalMinutes = 60;

    private static readonly BookingStatus[] ActiveBookingStatuses =
    [
        BookingStatus.PendingConfirmation,
        BookingStatus.Confirmed,
        BookingStatus.WaitingService,
        BookingStatus.InService,
        BookingStatus.WaitingPayment
    ];

    private static readonly BookingStatus[] CancellableBookingStatuses =
    [
        BookingStatus.PendingConfirmation
    ];

    [Authorize(Roles = "Customer")]
    [HttpPost]
    public async Task<ActionResult<BookingResponse>> CreateBooking(
        CreateBookingRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await BookingWriteLock.BeginAsync(dbContext, cancellationToken);
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

        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return CreatedAtAction(nameof(GetBooking), new { id = booking.Id }, response);
    }

    [Authorize(Roles = "FrontDeskStaff,Owner,Admin")]
    [HttpPost("staff")]
    public async Task<ActionResult<BookingResponse>> CreateStaffBooking(
        CreateStaffBookingRequest request,
        CancellationToken cancellationToken)
    {
        await using var transaction = await BookingWriteLock.BeginAsync(dbContext, cancellationToken);
        if (string.IsNullOrWhiteSpace(request.GuestName))
        {
            return BadRequest(new { message = "Guest name is required." });
        }

        if (string.IsNullOrWhiteSpace(request.GuestPhoneNumber))
        {
            return BadRequest(new { message = "Guest phone number is required." });
        }

        User? customer = null;
        if (request.CustomerId is not null)
        {
            customer = await dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    user => user.Id == request.CustomerId
                        && user.Role == UserRole.Customer
                        && user.AccountStatus == AccountStatus.Active,
                    cancellationToken);

            if (customer is null)
            {
                return BadRequest(new { message = "Selected customer account was not found." });
            }
        }

        var validationError = ValidateCreateBookingRequest(request.BarberId, request.ServiceIds);
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
            BookingSource = BookingSource.StaffCreated,
            CustomerId = customer?.Id,
            GuestName = customer is null ? request.GuestName.Trim() : null,
            GuestPhoneNumber = customer is null ? request.GuestPhoneNumber.Trim() : null,
            GuestEmail = customer is null ? NormalizeOptionalText(request.GuestEmail) : null,
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
            CreatedByUserId = GetCurrentUserId(),
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
                AddedByUserId = booking.CreatedByUserId,
                CreatedAt = now
            });
        }

        dbContext.Bookings.Add(booking);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await BookingResponseQuery()
            .Where(existingBooking => existingBooking.Id == booking.Id)
            .Select(existingBooking => ToResponse(existingBooking))
            .FirstAsync(cancellationToken);

        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
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
        await using var transaction = await BookingWriteLock.BeginAsync(dbContext, cancellationToken);
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

        if (!CancellableBookingStatuses.Contains(booking.BookingStatus))
        {
            return BadRequest(new { message = "Booking can only be cancelled before it is confirmed." });
        }

        var now = (timeProvider ?? TimeProvider.System).GetUtcNow();
        var reason = NormalizeOptionalText(request.Reason);
        if (User.IsInRole("Customer"))
        {
            if (booking.StartAt - now < TimeSpan.FromHours(1))
                return BadRequest(new { message = "ยกเลิกออนไลน์ได้ก่อนเวลานัดอย่างน้อย 1 ชั่วโมง กรุณาติดต่อร้าน" });
            if (reason is null)
                return BadRequest(new { message = "กรุณาระบุเหตุผลการยกเลิก" });
        }

        booking.BookingStatus = BookingStatus.Cancelled;
        booking.CancelReason = reason;
        booking.CancelledAt = now;
        booking.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);

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

        return await AvailabilityForDuration(barberId, date, durationMinutes, cancellationToken);
    }

    private async Task<ActionResult<IReadOnlyList<AvailabilitySlotResponse>>> AvailabilityForDuration(
        Guid barberId, DateOnly date, int durationMinutes, CancellationToken cancellationToken, Guid? excludedBookingId = null)
    {
        var slotIntervalMinutes = BookingStartIntervalMinutes;

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
        var shop = await dbContext.ShopSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        if (shop is not null)
        {
            var opening = new DateTimeOffset(date.ToDateTime(shop.OpeningTime), ShopUtcOffset);
            var closing = new DateTimeOffset(date.ToDateTime(shop.ClosingTime), ShopUtcOffset);
            if (opening > dayStart) dayStart = opening;
            if (closing < dayEnd) dayEnd = closing;
        }
        if (!await dbContext.BarberProfiles.AnyAsync(b => b.Id == barberId && b.IsAvailable && b.AcceptsBooking && b.User.AccountStatus == AccountStatus.Active, cancellationToken))
            return Ok(Array.Empty<AvailabilitySlotResponse>());
        var dayStartUtc = dayStart.ToUniversalTime();
        var dayEndUtc = dayEnd.ToUniversalTime();
        var resourceBarberIds = await GetBookingResourceBarberIds(barberId, cancellationToken);
        var existingBookings = await dbContext.Bookings
            .AsNoTracking()
            .Where(booking => booking.Id != excludedBookingId && booking.BarberId.HasValue
                && resourceBarberIds.Contains(booking.BarberId.Value)
                && ActiveBookingStatuses.Contains(booking.BookingStatus)
                && booking.StartAt < dayEndUtc
                && booking.EndAt > dayStartUtc)
            .Select(booking => new { booking.StartAt, booking.EndAt })
            .ToListAsync(cancellationToken);

        var slots = new List<AvailabilitySlotResponse>();
        var closures = await dbContext.BarberBookingClosures.AsNoTracking()
            .Where(c => c.BarberId == barberId && c.ReopenedAt == null && c.StartAt < dayEndUtc && c.EndAt > dayStartUtc)
            .Select(c => new { c.StartAt, c.EndAt }).ToListAsync(cancellationToken);
        existingBookings.AddRange(closures);
        var approvedLeaves = await dbContext.LeaveRequests.AsNoTracking()
            .Where(l => l.BarberId == barberId && (l.Status == LeaveStatus.Approved || l.Status == LeaveStatus.CancellationPending) && l.StartAt < dayEndUtc && l.EndAt > dayStartUtc)
            .Select(l => new { l.StartAt, l.EndAt }).ToListAsync(cancellationToken);
        for (var startAt = dayStart; startAt.AddMinutes(durationMinutes) <= dayEnd; startAt = startAt.AddMinutes(slotIntervalMinutes))
        {
            var endAt = startAt.AddMinutes(durationMinutes);
            var overlaps = existingBookings.Any(booking => startAt < booking.EndAt && endAt > booking.StartAt)
                || approvedLeaves.Any(leave => startAt < leave.EndAt && endAt > leave.StartAt);

            var busyPeriods = existingBookings.Select(booking => (booking.StartAt, booking.EndAt))
                .Concat(approvedLeaves.Select(leave => (leave.StartAt, leave.EndAt)));
            var freeUntil = dayEnd;
            foreach (var period in busyPeriods)
            {
                if (period.StartAt <= startAt && period.EndAt > startAt)
                {
                    freeUntil = startAt;
                    break;
                }
                if (period.StartAt > startAt && period.StartAt < freeUntil)
                    freeUntil = period.StartAt;
            }
            slots.Add(new AvailabilitySlotResponse(startAt, endAt, !overlaps,
                (int)(freeUntil - startAt).TotalMinutes));
        }

        return Ok(slots);
    }

    private async Task<Guid?> RescheduleStaff(CancellationToken ct)
    {
        var id = GetCurrentUserId();
        if (id is null || !(User.IsInRole("Owner") || User.IsInRole("Admin") || User.IsInRole("FrontDeskStaff"))) return null;
        return await dbContext.Users.Where(u => u.Id == id && u.AccountStatus == AccountStatus.Active
            && (u.Role == UserRole.Owner || u.Role == UserRole.Admin || u.Role == UserRole.FrontDeskStaff))
            .Select(u => (Guid?)u.Id).FirstOrDefaultAsync(ct);
    }

    private static bool CanReschedule(Booking booking) => booking.ServiceStartedAt is null
        && booking.BookingStatus is BookingStatus.PendingConfirmation or BookingStatus.Confirmed or BookingStatus.WaitingService;

    [HttpGet("{id:guid}/reschedule")]
    [Authorize(Roles = "Owner,Admin,FrontDeskStaff")]
    public async Task<IActionResult> GetRescheduleOptions(Guid id, [FromQuery] Guid? barberId,
        [FromQuery] DateOnly? date, CancellationToken ct)
    {
        if (await RescheduleStaff(ct) is null) return Forbid();
        var booking = await BookingResponseQuery().AsNoTracking().FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null) return NotFound();
        if (!CanReschedule(booking)) return Conflict(new { message = "แก้ไขได้เฉพาะคิวที่ยังไม่เริ่มบริการ" });
        var serviceIds = booking.BookingServices.Select(s => s.ServiceId).Distinct().ToList();
        var candidates = await dbContext.BarberProfiles.AsNoTracking().Include(b => b.User).Include(b => b.BarberServices)
            .Where(b => b.IsAvailable && b.AcceptsBooking && b.User.AccountStatus == AccountStatus.Active).ToListAsync(ct);
        var barbers = candidates.Where(b => b.BarberServices.Count == 0 || serviceIds.All(s => b.BarberServices.Any(bs => bs.ServiceId == s)))
            .Select(b => new { b.Id, FullName = b.User.FullName }).ToList();
        var targetBarber = barberId ?? booking.BarberId;
        var targetDate = date ?? DateOnly.FromDateTime(booking.StartAt.ToOffset(ShopUtcOffset).Date);
        var duration = booking.BookingServices.Sum(s => s.DurationMinutes * s.Quantity);
        IReadOnlyList<AvailabilitySlotResponse> slots = [];
        if (duration > 0 && barbers.Any(b => b.Id == targetBarber))
        {
            var result = await AvailabilityForDuration(targetBarber!.Value, targetDate, duration, ct, id);
            if (result.Result is OkObjectResult { Value: IReadOnlyList<AvailabilitySlotResponse> available })
                slots = available.Where(s => s.IsAvailable && s.StartAt > DateTimeOffset.UtcNow).ToList();
        }
        return Ok(new { booking.UpdatedAt, booking.BarberId, booking.StartAt, booking.EndAt,
            booking.TotalAmount, BookingStatus = booking.BookingStatus.ToString(), Barbers = barbers, Slots = slots });
    }

    [HttpPut("{id:guid}/reschedule")]
    [Authorize(Roles = "Owner,Admin,FrontDeskStaff")]
    public async Task<IActionResult> Reschedule(Guid id, RescheduleBookingRequest request, CancellationToken ct)
    {
        var actor = await RescheduleStaff(ct);
        if (actor is null) return Forbid();
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length > 500)
            return BadRequest(new { message = "ระบุเหตุผลการแก้ไขไม่เกิน 500 ตัวอักษร" });
        await using var transaction = await BookingWriteLock.BeginAsync(dbContext, ct);
        var booking = await BookingResponseQuery().FirstOrDefaultAsync(b => b.Id == id, ct);
        if (booking is null) return NotFound();
        if (!CanReschedule(booking)) return Conflict(new { message = "คิวเริ่มบริการหรือสิ้นสุดแล้ว ไม่สามารถแก้ไขนัดหมายได้" });
        if (booking.UpdatedAt != request.ExpectedUpdatedAt)
            return Conflict(new { message = "คิวนี้มีการเปลี่ยนแปลงแล้ว กรุณาปิดหน้าต่างและรีเฟรชคิว" });
        var barber = await dbContext.BarberProfiles.Include(b => b.User).Include(b => b.BarberServices)
            .FirstOrDefaultAsync(b => b.Id == request.BarberId && b.IsAvailable && b.AcceptsBooking && b.User.AccountStatus == AccountStatus.Active, ct);
        if (barber is null || (barber.BarberServices.Count > 0 && booking.BookingServices.Any(s => !barber.BarberServices.Any(bs => bs.ServiceId == s.ServiceId))))
            return BadRequest(new { message = "ช่างที่เลือกไม่สามารถรับบริการในคิวนี้ได้" });
        var start = request.StartAt.ToUniversalTime();
        var duration = booking.BookingServices.Sum(s => s.DurationMinutes * s.Quantity);
        if (duration <= 0) return BadRequest(new { message = "คิวนี้ไม่มีระยะเวลาบริการที่ถูกต้อง" });
        var end = start.AddMinutes(duration);
        if (booking.BarberId == barber.Id && booking.StartAt == start)
            return BadRequest(new { message = "ยังไม่ได้เปลี่ยนช่างหรือเวลานัดหมาย" });
        var error = await ValidateBookingAvailability(barber.Id, request.StartAt, start, end, ct, id);
        if (error is not null) return BadRequest(new { message = error });
        var oldStatus = booking.BookingStatus;
        var now = DateTimeOffset.UtcNow;
        var note = System.Text.Json.JsonSerializer.Serialize(new {
            Action = "Rescheduled", FromBarberId = booking.BarberId, ToBarberId = barber.Id,
            FromStartAt = booking.StartAt, FromEndAt = booking.EndAt, ToStartAt = start, ToEndAt = end,
            Reason = request.Reason.Trim()
        });
        if (booking.BarberId != barber.Id)
            dbContext.BarberAssignmentEvents.Add(new() { Id = Guid.NewGuid(), BookingId = id,
                FromBarberId = booking.BarberId, ToBarberId = barber.Id, ChangedByUserId = actor.Value,
                Reason = request.Reason.Trim(), CreatedAt = now });
        if (booking.StartAt != start)
        {
            booking.BookingStatus = BookingStatus.PendingConfirmation;
            booking.CheckedInAt = null;
        }
        booking.BarberId = barber.Id; booking.StartAt = start; booking.EndAt = end;
        booking.EstimatedDurationMinutes = duration; booking.UpdatedAt = now;
        dbContext.QueueEvents.Add(new() { Id = Guid.NewGuid(), BookingId = id, FromStatus = oldStatus,
            ToStatus = booking.BookingStatus, ChangedByUserId = actor.Value, Note = note, CreatedAt = now });
        await dbContext.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Ok(new { booking.Id, booking.StartAt, booking.EndAt, booking.UpdatedAt });
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
        CancellationToken cancellationToken,
        Guid? excludedBookingId = null)
    {
        if (startAtUtc <= DateTimeOffset.UtcNow)
        {
            return "Booking start time must be in the future.";
        }

        var requestedStartAtLocal = requestedStartAt.ToOffset(ShopUtcOffset);
        if (await dbContext.BarberBookingClosures.AnyAsync(c => c.BarberId == barberId && c.ReopenedAt == null && c.StartAt < endAtUtc && c.EndAt > startAtUtc, cancellationToken))
            return "ร้านปิดรับจองช่างในช่วงนี้ กรุณาเลือกช่างหรือเวลาอื่น";
        if (await dbContext.LeaveRequests.AnyAsync(l => l.BarberId == barberId && (l.Status == LeaveStatus.Approved || l.Status == LeaveStatus.CancellationPending) && l.StartAt < endAtUtc && l.EndAt > startAtUtc, cancellationToken))
            return "ช่างลาช่วงเวลานี้ กรุณาเลือกเวลาอื่น";
        var requestedEndAtLocal = requestedStartAtLocal.Add(endAtUtc - startAtUtc);
        var bookingDate = DateOnly.FromDateTime(requestedStartAtLocal.DateTime);
        var shop = await dbContext.ShopSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        if (requestedStartAtLocal.Date != requestedEndAtLocal.Date || (shop is not null && (requestedStartAtLocal.TimeOfDay < shop.OpeningTime.ToTimeSpan() || requestedEndAtLocal.TimeOfDay > shop.ClosingTime.ToTimeSpan())))
            return "เวลาที่เลือกอยู่นอกเวลาเปิดร้าน";
        if (requestedStartAtLocal.Minute != 0 || requestedStartAtLocal.Second != 0 || requestedStartAtLocal.Millisecond != 0)
        {
            return "Booking start time must be on the hour.";
        }

        if (await IsShopHoliday(bookingDate, cancellationToken))
        {
            return "Selected date is a shop holiday.";
        }

        var workingHour = await dbContext.BarberWorkingHours
            .AsNoTracking()
            .FirstOrDefaultAsync(
                workingHour => workingHour.BarberId == barberId
                    && workingHour.DayOfWeek == (int)requestedStartAtLocal.DayOfWeek
                    && workingHour.IsWorkingDay,
                cancellationToken);

        if (workingHour is null)
        {
            return "Selected barber is not working at the selected date.";
        }

        if (requestedStartAtLocal.TimeOfDay < workingHour.StartTime.ToTimeSpan()
            || requestedEndAtLocal.TimeOfDay > workingHour.EndTime.ToTimeSpan())
        {
            return "Selected time is outside barber working hours.";
        }

        var resourceBarberIds = await GetBookingResourceBarberIds(barberId, cancellationToken);
        var overlaps = await dbContext.Bookings
            .AnyAsync(
                booking => booking.Id != excludedBookingId && booking.BarberId.HasValue
                && resourceBarberIds.Contains(booking.BarberId.Value)
                    && ActiveBookingStatuses.Contains(booking.BookingStatus)
                    && startAtUtc < booking.EndAt
                    && endAtUtc > booking.StartAt,
                cancellationToken);

        return overlaps ? "Selected time overlaps another booking." : null;
    }

    private async Task<IReadOnlyList<Guid>> GetBookingResourceBarberIds(Guid barberId, CancellationToken cancellationToken)
    {
        var barberName = await dbContext.BarberProfiles
            .AsNoTracking()
            .Where(barber => barber.Id == barberId)
            .Select(barber => barber.User.FullName)
            .FirstOrDefaultAsync(cancellationToken);

        if (barberName is not ("ช่างนุค" or "ช่างนุ้ย"))
        {
            return [barberId];
        }

        return await dbContext.BarberProfiles
            .AsNoTracking()
            .Where(barber => barber.User.FullName == "ช่างนุค" || barber.User.FullName == "ช่างนุ้ย")
            .Select(barber => barber.Id)
            .ToListAsync(cancellationToken);
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
            booking.Customer?.FullName ?? booking.GuestName,
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
        return ValidateCreateBookingRequest(request.BarberId, request.ServiceIds);
    }

    private static string? ValidateCreateBookingRequest(Guid barberId, IReadOnlyList<Guid> serviceIds)
    {
        if (barberId == Guid.Empty)
        {
            return "Barber id is required.";
        }

        if (serviceIds.Count == 0)
        {
            return "At least one service is required.";
        }

        if (serviceIds.Any(serviceId => serviceId == Guid.Empty))
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
