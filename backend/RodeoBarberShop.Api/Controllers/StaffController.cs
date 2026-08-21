using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Staff;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;
using RodeoBarberShop.Api.Services.Auth;

namespace RodeoBarberShop.Api.Controllers;

[ApiController]
[Authorize(Roles = "Owner,Admin")]
[Route("api/[controller]")]
public class StaffController(ApplicationDbContext dbContext, IPasswordHasher passwordHasher) : ControllerBase
{
    private static readonly UserRole[] ManageableRoles = [UserRole.Barber, UserRole.FrontDeskStaff];

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StaffResponse>>> GetStaff(CancellationToken cancellationToken)
    {
        var staff = await BaseStaffQuery()
            .Where(user => ManageableRoles.Contains(user.Role))
            .OrderBy(user => user.Role)
            .ThenBy(user => user.FullName)
            .Select(user => ToResponse(user))
            .ToListAsync(cancellationToken);

        return Ok(staff);
    }

    [HttpPost]
    public async Task<ActionResult<StaffResponse>> CreateStaff(CreateStaffRequest request, CancellationToken cancellationToken)
    {
        var validationError = ValidateStaff(request.FullName, request.PhoneNumber, request.Role, request.ExperienceYears);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new { message = "Email is required." });
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            return BadRequest(new { message = "Password must be at least 8 characters." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var emailExists = await dbContext.Users.AnyAsync(user => user.Email == normalizedEmail, cancellationToken);
        if (emailExists)
        {
            return Conflict(new { message = "Email is already registered." });
        }

        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            Nickname = NormalizeOptionalText(request.Nickname),
            PhoneNumber = request.PhoneNumber.Trim(),
            Email = normalizedEmail,
            PasswordHash = passwordHasher.HashPassword(request.Password),
            Role = request.Role,
            AccountStatus = AccountStatus.Active,
            StartDate = request.StartDate,
            Note = NormalizeOptionalText(request.Note),
            CreatedAt = now,
            UpdatedAt = now
        };

        if (request.Role == UserRole.Barber)
        {
            user.BarberProfile = new BarberProfile
            {
                Id = Guid.NewGuid(),
                Specialty = NormalizeOptionalText(request.Specialty),
                ExperienceYears = request.ExperienceYears,
                Bio = NormalizeOptionalText(request.Bio),
                IsAvailable = request.IsAvailable,
                AcceptsBooking = request.AcceptsBooking,
                CreatedAt = now,
                UpdatedAt = now
            };
        }

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await BaseStaffQuery()
            .Where(staffUser => staffUser.Id == user.Id)
            .Select(staffUser => ToResponse(staffUser))
            .FirstAsync(cancellationToken);

        return CreatedAtAction(nameof(GetStaff), new { id = response.Id }, response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<StaffResponse>> UpdateStaff(
        Guid id,
        UpdateStaffRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateStaff(request.FullName, request.PhoneNumber, request.Role, request.ExperienceYears);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var user = await dbContext.Users
            .Include(user => user.BarberProfile)
            .FirstOrDefaultAsync(user => user.Id == id && ManageableRoles.Contains(user.Role), cancellationToken);

        if (user is null)
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;
        user.FullName = request.FullName.Trim();
        user.Nickname = NormalizeOptionalText(request.Nickname);
        user.PhoneNumber = request.PhoneNumber.Trim();
        user.Role = request.Role;
        user.AccountStatus = request.AccountStatus;
        user.StartDate = request.StartDate;
        user.Note = NormalizeOptionalText(request.Note);
        user.UpdatedAt = now;

        if (request.Role == UserRole.Barber)
        {
            user.BarberProfile ??= new BarberProfile
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                CreatedAt = now
            };

            user.BarberProfile.Specialty = NormalizeOptionalText(request.Specialty);
            user.BarberProfile.ExperienceYears = request.ExperienceYears;
            user.BarberProfile.Bio = NormalizeOptionalText(request.Bio);
            user.BarberProfile.IsAvailable = request.IsAvailable;
            user.BarberProfile.AcceptsBooking = request.AcceptsBooking;
            user.BarberProfile.UpdatedAt = now;
        }
        else if (user.BarberProfile is not null)
        {
            user.BarberProfile.IsAvailable = false;
            user.BarberProfile.AcceptsBooking = false;
            user.BarberProfile.UpdatedAt = now;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await BaseStaffQuery()
            .Where(staffUser => staffUser.Id == user.Id)
            .Select(staffUser => ToResponse(staffUser))
            .FirstAsync(cancellationToken);

        return Ok(response);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DisableStaff(Guid id, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .Include(user => user.BarberProfile)
            .FirstOrDefaultAsync(user => user.Id == id && ManageableRoles.Contains(user.Role), cancellationToken);

        if (user is null)
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;
        user.AccountStatus = AccountStatus.Disabled;
        user.UpdatedAt = now;

        if (user.BarberProfile is not null)
        {
            user.BarberProfile.IsAvailable = false;
            user.BarberProfile.AcceptsBooking = false;
            user.BarberProfile.UpdatedAt = now;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPut("{id:guid}/password")]
    public async Task<IActionResult> ResetPassword(
        Guid id,
        ResetStaffPasswordRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            return BadRequest(new { message = "Password must be at least 8 characters." });
        }

        var user = await dbContext.Users
            .FirstOrDefaultAsync(user => user.Id == id && ManageableRoles.Contains(user.Role), cancellationToken);

        if (user is null)
        {
            return NotFound();
        }

        user.PasswordHash = passwordHasher.HashPassword(request.Password);
        user.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private IQueryable<User> BaseStaffQuery()
    {
        return dbContext.Users
            .AsNoTracking()
            .Include(user => user.BarberProfile);
    }

    private static StaffResponse ToResponse(User user)
    {
        return new StaffResponse(
            user.Id,
            user.BarberProfile?.Id,
            user.FullName,
            user.Nickname,
            user.Email,
            user.PhoneNumber,
            user.Role,
            user.AccountStatus,
            user.StartDate,
            user.Note,
            user.BarberProfile?.Specialty,
            user.BarberProfile?.ExperienceYears,
            user.BarberProfile?.Bio,
            user.BarberProfile?.IsAvailable ?? false,
            user.BarberProfile?.AcceptsBooking ?? false,
            user.CreatedAt,
            user.UpdatedAt);
    }

    private static string? ValidateStaff(string fullName, string phoneNumber, UserRole role, int? experienceYears)
    {
        if (string.IsNullOrWhiteSpace(fullName))
        {
            return "Full name is required.";
        }

        if (string.IsNullOrWhiteSpace(phoneNumber))
        {
            return "Phone number is required.";
        }

        if (!ManageableRoles.Contains(role))
        {
            return "Role must be Barber or FrontDeskStaff.";
        }

        if (experienceYears is < 0)
        {
            return "Experience years must be zero or greater.";
        }

        return null;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
