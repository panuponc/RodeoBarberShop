using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Barbers;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BarbersController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BarberResponse>>> GetBarbers(CancellationToken cancellationToken)
    {
        var barbers = await BaseBarberQuery()
            .Where(barber => barber.User.AccountStatus == AccountStatus.Active)
            .OrderBy(barber => barber.User.FullName)
            .Select(barber => ToResponse(barber))
            .ToListAsync(cancellationToken);

        return Ok(barbers);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BarberResponse>> GetBarber(Guid id, CancellationToken cancellationToken)
    {
        var barber = await BaseBarberQuery()
            .Where(barber => barber.Id == id && barber.User.AccountStatus == AccountStatus.Active)
            .Select(barber => ToResponse(barber))
            .FirstOrDefaultAsync(cancellationToken);

        return barber is null ? NotFound() : Ok(barber);
    }

    [Authorize(Roles = "Barber")]
    [HttpGet("me")]
    public async Task<ActionResult<BarberResponse>> GetMyProfile(CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId is null)
        {
            return Unauthorized();
        }

        var barber = await BaseBarberQuery()
            .Where(barber => barber.UserId == currentUserId.Value && barber.User.AccountStatus == AccountStatus.Active)
            .Select(barber => ToResponse(barber))
            .FirstOrDefaultAsync(cancellationToken);

        return barber is null ? NotFound() : Ok(barber);
    }

    [Authorize(Roles = "Barber")]
    [HttpPut("me")]
    public async Task<ActionResult<BarberResponse>> UpdateMyProfile(
        UpdateOwnBarberProfileRequest request,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();
        if (currentUserId is null)
        {
            return Unauthorized();
        }

        var validationError = ValidateOwnProfile(request);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var barber = await dbContext.BarberProfiles
            .Include(barber => barber.User)
            .FirstOrDefaultAsync(
                barber => barber.UserId == currentUserId.Value
                    && barber.User.AccountStatus == AccountStatus.Active,
                cancellationToken);

        if (barber is null)
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;
        barber.User.FullName = request.FullName.Trim();
        barber.User.Nickname = NormalizeOptionalText(request.Nickname);
        barber.User.PhoneNumber = request.PhoneNumber.Trim();
        barber.User.UpdatedAt = now;
        barber.Specialty = NormalizeOptionalText(request.Specialty);
        barber.ExperienceYears = request.ExperienceYears;
        barber.Bio = NormalizeOptionalText(request.Bio);
        barber.IsAvailable = request.IsAvailable;
        barber.AcceptsBooking = request.AcceptsBooking;
        barber.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await BaseBarberQuery()
            .Where(updatedBarber => updatedBarber.Id == barber.Id)
            .Select(updatedBarber => ToResponse(updatedBarber))
            .FirstAsync(cancellationToken);

        return Ok(response);
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<BarberResponse>> UpdateBarber(
        Guid id,
        UpdateBarberRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateBarber(request);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var barber = await dbContext.BarberProfiles
            .Include(barber => barber.User)
            .Include(barber => barber.BarberServices)
            .ThenInclude(barberService => barberService.Service)
            .FirstOrDefaultAsync(barber => barber.Id == id, cancellationToken);

        if (barber is null)
        {
            return NotFound();
        }

        var distinctServiceIds = request.ServiceIds.Distinct().ToList();
        var activeServiceIds = await dbContext.Services
            .Where(service => distinctServiceIds.Contains(service.Id) && service.IsActive)
            .Select(service => service.Id)
            .ToListAsync(cancellationToken);

        if (activeServiceIds.Count != distinctServiceIds.Count)
        {
            return BadRequest(new { message = "Every service id must refer to an active service." });
        }

        var now = DateTimeOffset.UtcNow;
        barber.User.FullName = request.FullName.Trim();
        barber.User.Nickname = NormalizeOptionalText(request.Nickname);
        barber.User.PhoneNumber = request.PhoneNumber.Trim();
        barber.User.UpdatedAt = now;
        barber.Specialty = NormalizeOptionalText(request.Specialty);
        barber.ExperienceYears = request.ExperienceYears;
        barber.Bio = NormalizeOptionalText(request.Bio);
        barber.IsAvailable = request.IsAvailable;
        barber.AcceptsBooking = request.AcceptsBooking;
        barber.UpdatedAt = now;

        var existingServiceIds = barber.BarberServices.Select(barberService => barberService.ServiceId).ToHashSet();
        var requestedServiceIds = activeServiceIds.ToHashSet();

        var removedServices = barber.BarberServices
            .Where(barberService => !requestedServiceIds.Contains(barberService.ServiceId))
            .ToList();
        dbContext.BarberServices.RemoveRange(removedServices);

        var addedServiceIds = requestedServiceIds.Except(existingServiceIds);
        foreach (var serviceId in addedServiceIds)
        {
            barber.BarberServices.Add(new BarberService
            {
                Id = Guid.NewGuid(),
                BarberId = barber.Id,
                ServiceId = serviceId,
                CreatedAt = now
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await BaseBarberQuery()
            .Where(barber => barber.Id == id)
            .Select(barber => ToResponse(barber))
            .FirstAsync(cancellationToken);

        return Ok(response);
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPut("{id:guid}/standby-priority")]
    public async Task<ActionResult<BarberResponse>> UpdateStandbyPriority(
        Guid id,
        UpdateStandbyPriorityRequest request,
        CancellationToken cancellationToken)
    {
        if (request.StandbyPriority is < 1 or > 99)
        {
            return BadRequest(new { message = "Standby priority must be between 1 and 99." });
        }

        var barber = await dbContext.BarberProfiles
            .FirstOrDefaultAsync(barber => barber.Id == id, cancellationToken);

        if (barber is null)
        {
            return NotFound();
        }

        if (request.StandbyPriority is not null)
        {
            var priorityInUse = await dbContext.BarberProfiles.AnyAsync(
                otherBarber => otherBarber.Id != id
                    && otherBarber.StandbyPriority == request.StandbyPriority,
                cancellationToken);

            if (priorityInUse)
            {
                return Conflict(new { message = "Standby priority is already used by another barber." });
            }
        }

        barber.StandbyPriority = request.StandbyPriority;
        barber.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await BaseBarberQuery()
            .Where(updatedBarber => updatedBarber.Id == id)
            .Select(updatedBarber => ToResponse(updatedBarber))
            .FirstAsync(cancellationToken);

        return Ok(response);
    }

    [Authorize(Roles = "FrontDeskStaff,Owner,Admin")]
    [HttpPut("{id:guid}/availability")]
    public async Task<ActionResult<BarberResponse>> UpdateAvailability(
        Guid id,
        UpdateBarberAvailabilityRequest request,
        CancellationToken cancellationToken)
    {
        var barber = await dbContext.BarberProfiles
            .FirstOrDefaultAsync(barber => barber.Id == id, cancellationToken);

        if (barber is null)
        {
            return NotFound();
        }

        barber.IsAvailable = request.IsAvailable;
        barber.AcceptsBooking = request.AcceptsBooking;
        barber.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await BaseBarberQuery()
            .Where(barber => barber.Id == id)
            .Select(barber => ToResponse(barber))
            .FirstAsync(cancellationToken);

        return Ok(response);
    }

    [Authorize]
    [HttpGet("{id:guid}/schedule")]
    public async Task<ActionResult<BarberScheduleResponse>> GetSchedule(Guid id, CancellationToken cancellationToken)
    {
        var schedule = await dbContext.BarberProfiles
            .AsNoTracking()
            .Where(barber => barber.Id == id)
            .Select(barber => new BarberScheduleResponse(
                barber.Id,
                barber.User.FullName,
                barber.WorkingHours
                    .OrderBy(workingHour => workingHour.DayOfWeek)
                    .Select(workingHour => ToResponse(workingHour))
                    .ToList()))
            .FirstOrDefaultAsync(cancellationToken);

        return schedule is null ? NotFound() : Ok(schedule);
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPut("{id:guid}/working-hours")]
    public async Task<ActionResult<BarberScheduleResponse>> UpdateWorkingHours(
        Guid id,
        UpdateBarberWorkingHoursRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateWorkingHours(request.WorkingHours);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var barber = await dbContext.BarberProfiles
            .FirstOrDefaultAsync(barber => barber.Id == id, cancellationToken);

        if (barber is null)
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;
        await dbContext.BarberWorkingHours
            .Where(workingHour => workingHour.BarberId == barber.Id)
            .ExecuteDeleteAsync(cancellationToken);

        var newWorkingHours = request.WorkingHours
            .OrderBy(workingHour => workingHour.DayOfWeek)
            .Select(workingHour => new BarberWorkingHour
            {
                Id = Guid.NewGuid(),
                BarberId = barber.Id,
                DayOfWeek = workingHour.DayOfWeek,
                StartTime = workingHour.StartTime,
                EndTime = workingHour.EndTime,
                IsWorkingDay = workingHour.IsWorkingDay,
                CreatedAt = now,
                UpdatedAt = now
            })
            .ToList();

        dbContext.BarberWorkingHours.AddRange(newWorkingHours);

        barber.UpdatedAt = now;
        await dbContext.SaveChangesAsync(cancellationToken);

        var schedule = await dbContext.BarberProfiles
            .AsNoTracking()
            .Where(barber => barber.Id == id)
            .Select(barber => new BarberScheduleResponse(
                barber.Id,
                barber.User.FullName,
                barber.WorkingHours
                    .OrderBy(workingHour => workingHour.DayOfWeek)
                    .Select(workingHour => ToResponse(workingHour))
                    .ToList()))
            .FirstAsync(cancellationToken);

        return Ok(schedule);
    }

    private IQueryable<BarberProfile> BaseBarberQuery()
    {
        return dbContext.BarberProfiles
            .AsNoTracking()
            .Include(barber => barber.User)
            .Include(barber => barber.BarberServices)
            .ThenInclude(barberService => barberService.Service);
    }

    private static BarberResponse ToResponse(BarberProfile barber)
    {
        return new BarberResponse(
            barber.Id,
            barber.UserId,
            barber.User.FullName,
            barber.User.Nickname,
            barber.User.Email,
            barber.User.PhoneNumber,
            barber.Specialty,
            barber.ExperienceYears,
            barber.StandbyPriority,
            barber.Bio,
            barber.IsAvailable,
            barber.AcceptsBooking,
            barber.BarberServices
                .Where(barberService => barberService.Service.IsActive)
                .OrderBy(barberService => barberService.Service.Name)
                .Select(barberService => new BarberServiceResponse(
                    barberService.ServiceId,
                    barberService.Service.Name,
                    barberService.Service.Price,
                    barberService.Service.DurationMinutes))
                .ToList(),
            barber.CreatedAt,
            barber.UpdatedAt);
    }

    private static BarberWorkingHourResponse ToResponse(BarberWorkingHour workingHour)
    {
        return new BarberWorkingHourResponse(
            workingHour.Id,
            workingHour.DayOfWeek,
            workingHour.StartTime,
            workingHour.EndTime,
            workingHour.IsWorkingDay);
    }

    private static string? ValidateBarber(UpdateBarberRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return "Full name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            return "Phone number is required.";
        }

        if (request.ExperienceYears is < 0)
        {
            return "Experience years must be zero or greater.";
        }

        return null;
    }

    private static string? ValidateOwnProfile(UpdateOwnBarberProfileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return "Full name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            return "Phone number is required.";
        }

        if (request.ExperienceYears is < 0)
        {
            return "Experience years must be zero or greater.";
        }

        return null;
    }

    private static string? ValidateWorkingHours(IReadOnlyList<BarberWorkingHourRequest> workingHours)
    {
        if (workingHours.Count == 0)
        {
            return "At least one working hour is required.";
        }

        if (workingHours.Select(workingHour => workingHour.DayOfWeek).Distinct().Count() != workingHours.Count)
        {
            return "Day of week must not be duplicated.";
        }

        foreach (var workingHour in workingHours)
        {
            if (workingHour.DayOfWeek is < 0 or > 6)
            {
                return "Day of week must be between 0 and 6.";
            }

            if (workingHour.IsWorkingDay && workingHour.StartTime >= workingHour.EndTime)
            {
                return "Start time must be before end time for working days.";
            }
        }

        return null;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private Guid? GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(userId, out var parsedUserId) ? parsedUserId : null;
    }
}
