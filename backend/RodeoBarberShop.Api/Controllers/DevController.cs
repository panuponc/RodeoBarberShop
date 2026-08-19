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

    private static SeedOwnerResponse ToResponse(User user, bool created)
    {
        return new SeedOwnerResponse(
            user.Id,
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
}
