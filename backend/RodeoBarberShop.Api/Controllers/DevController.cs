using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Dev;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;
using RodeoBarberShop.Api.Services.Auth;

namespace RodeoBarberShop.Api.Controllers;

[ApiController]
[Route("api/dev")]
public class DevController(
    ApplicationDbContext dbContext,
    IPasswordHasher passwordHasher,
    IWebHostEnvironment environment) : ControllerBase
{
    [HttpPost("seed-owner")]
    public async Task<ActionResult<SeedOwnerResponse>> SeedOwner(
        SeedOwnerRequest request,
        CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
        {
            return NotFound();
        }

        var validationError = ValidateRequest(request);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var existingUser = await dbContext.Users
            .FirstOrDefaultAsync(user => user.Email == normalizedEmail, cancellationToken);

        if (existingUser is not null)
        {
            return Ok(ToResponse(existingUser, created: false));
        }

        var now = DateTimeOffset.UtcNow;
        var owner = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            Email = normalizedEmail,
            PasswordHash = passwordHasher.HashPassword(request.Password),
            Role = UserRole.Owner,
            AccountStatus = AccountStatus.Active,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.Users.Add(owner);
        await dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(SeedOwner), ToResponse(owner, created: true));
    }

    [HttpPost("seed-barber")]
    public async Task<ActionResult<SeedBarberResponse>> SeedBarber(
        SeedBarberRequest request,
        CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
        {
            return NotFound();
        }

        var validationError = ValidateRequest(request);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var existingUser = await dbContext.Users
            .Include(user => user.BarberProfile)
            .FirstOrDefaultAsync(user => user.Email == normalizedEmail, cancellationToken);

        if (existingUser is not null)
        {
            if (existingUser.BarberProfile is null)
            {
                return Conflict(new { message = "Email already exists but is not a barber account." });
            }

            return Ok(ToResponse(existingUser, existingUser.BarberProfile, created: false));
        }

        var now = DateTimeOffset.UtcNow;
        var barberProfile = new BarberProfile
        {
            Id = Guid.NewGuid(),
            Specialty = NormalizeOptionalText(request.Specialty),
            ExperienceYears = request.ExperienceYears,
            Bio = NormalizeOptionalText(request.Bio),
            IsAvailable = true,
            AcceptsBooking = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        var barber = new User
        {
            Id = Guid.NewGuid(),
            FullName = request.FullName.Trim(),
            PhoneNumber = request.PhoneNumber.Trim(),
            Email = normalizedEmail,
            PasswordHash = passwordHasher.HashPassword(request.Password),
            Role = UserRole.Barber,
            AccountStatus = AccountStatus.Active,
            CreatedAt = now,
            UpdatedAt = now,
            BarberProfile = barberProfile
        };

        dbContext.Users.Add(barber);
        await dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(SeedBarber), ToResponse(barber, barberProfile, created: true));
    }

    private static SeedOwnerResponse ToResponse(User user, bool created)
    {
        return new SeedOwnerResponse(
            user.Id,
            user.FullName,
            user.Email,
            user.Role.ToString(),
            created);
    }

    private static SeedBarberResponse ToResponse(User user, BarberProfile barberProfile, bool created)
    {
        return new SeedBarberResponse(
            user.Id,
            barberProfile.Id,
            user.FullName,
            user.Email,
            user.Role.ToString(),
            created);
    }

    private static string? ValidateRequest(SeedOwnerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return "Full name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            return "Phone number is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return "Email is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            return "Password must be at least 8 characters.";
        }

        return null;
    }

    private static string? ValidateRequest(SeedBarberRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName))
        {
            return "Full name is required.";
        }

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            return "Phone number is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return "Email is required.";
        }

        if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Length < 8)
        {
            return "Password must be at least 8 characters.";
        }

        if (request.ExperienceYears is < 0)
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
