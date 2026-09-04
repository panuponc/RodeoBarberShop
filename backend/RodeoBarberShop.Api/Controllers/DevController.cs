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

    [HttpPost("seed-rodeo-barbers")]
    public async Task<ActionResult<IReadOnlyList<SeedBarberResponse>>> SeedRodeoBarbers(CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
        {
            return NotFound();
        }

        var seedBarbers = new[]
        {
            new RodeoBarberSeed(
                "ช่างเค้ก",
                "0810000001",
                "cake.barber@rodeobarber.local",
                "BarberPassword123!",
                "เก้าอี้ 1 / ติดกระจก",
                5,
                "ตัดวอลลุ่ม ตัดฟองซ์ อัพ-ดาวน์แพร์ม",
                new[] { 0, 3, 4, 5, 6 },
                null),
            new RodeoBarberSeed(
                "ช่างบั้ม",
                "0810000002",
                "bum.barber@rodeobarber.local",
                "BarberPassword123!",
                "เก้าอี้ 2 / ผมยาว",
                5,
                "ตัดวอลลุ่ม ตัดฟองซ์ อัพ-ดาวน์แพร์ม",
                new[] { 0, 1, 2, 4, 5, 6 },
                null),
            new RodeoBarberSeed(
                "ช่างนุค",
                "0810000003",
                "nook.barber@rodeobarber.local",
                "BarberPassword123!",
                "เก้าอี้ 3 / ใช้ร่วมกับช่างนุ้ย",
                5,
                "ผู้ชาย ตัดผมหญิง ทำสีแฟชั่น ดัดวอลลุ่ม ตัดฟองซ์ อัพ-ดาวน์แพร์ม",
                new[] { 0, 1, 2, 3, 6 },
                null),
            new RodeoBarberSeed(
                "ช่างนุ้ย",
                "0810000004",
                "nui.barber@rodeobarber.local",
                "BarberPassword123!",
                "เก้าอี้ 3 / จองล่วงหน้า 1 วัน",
                5,
                "ผู้ชาย ตัดผมหญิง ทำสีแฟชั่น ดัดวอลลุ่ม ตัดฟองซ์ อัพ-ดาวน์แพร์ม",
                new[] { 0, 1, 2, 3, 6 },
                null),
            new RodeoBarberSeed(
                "ช่างเปิ้ล",
                "0810000005",
                "ple.barber@rodeobarber.local",
                "BarberPassword123!",
                "เก้าอี้ 4",
                5,
                "ตัดวอลลุ่ม ตัดฟองซ์ อัพ-ดาวน์แพร์ม",
                new[] { 0, 1, 2, 3, 4 },
                null),
            new RodeoBarberSeed(
                "ช่างเดียว",
                "0810000006",
                "deaw.barber@rodeobarber.local",
                "BarberPassword123!",
                "เก้าอี้ 5 / หน้าทีวี",
                5,
                "ตัดวอลลุ่ม ตัดฟองซ์ อัพ-ดาวน์แพร์ม",
                new[] { 0, 1, 4, 5, 6 },
                null),
            new RodeoBarberSeed(
                "ช่างเหน่ง",
                "0810000007",
                "neng.barber@rodeobarber.local",
                "BarberPassword123!",
                "ช่างแทน ไม่มีเก้าอี้ประจำ",
                5,
                "ช่างแทนประจำร้าน เข้าทำงานแทนช่างที่หยุด",
                new[] { 1, 2, 3, 5, 6 },
                1),
        };

        var responses = new List<SeedBarberResponse>();
        foreach (var seed in seedBarbers)
        {
            responses.Add(await UpsertRodeoBarber(seed, cancellationToken));
        }

        await UpsertRodeoChairs(responses, cancellationToken);

        return Ok(responses);
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

    private async Task<SeedBarberResponse> UpsertRodeoBarber(RodeoBarberSeed seed, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var normalizedEmail = seed.Email.Trim().ToLowerInvariant();
        var user = await dbContext.Users
            .Include(existingUser => existingUser.BarberProfile)
            .FirstOrDefaultAsync(
                existingUser => existingUser.Email == normalizedEmail
                    || existingUser.FullName == seed.FullName,
                cancellationToken);
        var created = user is null;

        if (user is null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                CreatedAt = now,
                BarberProfile = new BarberProfile
                {
                    Id = Guid.NewGuid(),
                    CreatedAt = now
                }
            };

            dbContext.Users.Add(user);
        }
        else if (user.Role != UserRole.Barber || user.BarberProfile is null)
        {
            throw new InvalidOperationException($"Existing account for {seed.FullName} is not a barber account.");
        }

        user.FullName = seed.FullName;
        user.PhoneNumber = seed.PhoneNumber;
        user.Email = normalizedEmail;
        user.PasswordHash = passwordHasher.HashPassword(seed.Password);
        user.Role = UserRole.Barber;
        user.AccountStatus = AccountStatus.Active;
        user.UpdatedAt = now;

        var profile = user.BarberProfile!;
        profile.Specialty = seed.Specialty;
        profile.ExperienceYears = seed.ExperienceYears;
        profile.StandbyPriority = seed.StandbyPriority;
        profile.Bio = seed.Bio;
        profile.IsAvailable = true;
        profile.AcceptsBooking = true;
        profile.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        await dbContext.BarberWorkingHours
            .Where(workingHour => workingHour.BarberId == profile.Id)
            .ExecuteDeleteAsync(cancellationToken);

        var workingHours = new List<BarberWorkingHour>();
        foreach (var dayOfWeek in seed.WorkingDays)
        {
            workingHours.Add(new BarberWorkingHour
            {
                Id = Guid.NewGuid(),
                BarberId = profile.Id,
                DayOfWeek = dayOfWeek,
                StartTime = new TimeOnly(10, 0),
                EndTime = new TimeOnly(21, 0),
                IsWorkingDay = true,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        dbContext.BarberWorkingHours.AddRange(workingHours);
        await dbContext.SaveChangesAsync(cancellationToken);
        dbContext.ChangeTracker.Clear();

        return ToResponse(user, profile, created);
    }

    private async Task UpsertRodeoChairs(
        IReadOnlyList<SeedBarberResponse> seededBarbers,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var standbyBarberEmail = "neng.barber@rodeobarber.local";
        var chairSeeds = new[]
        {
            new RodeoChairSeed("เก้าอี้ 1", "ติดกระจก", 1, new[] { "cake.barber@rodeobarber.local" }, new[] { standbyBarberEmail }),
            new RodeoChairSeed("เก้าอี้ 2", "เก้าอี้ประจำ", 2, new[] { "bum.barber@rodeobarber.local" }, new[] { standbyBarberEmail }),
            new RodeoChairSeed("เก้าอี้ 3", "ช่างนุ้ยจองล่วงหน้า 1 วัน", 3, new[] { "nook.barber@rodeobarber.local", "nui.barber@rodeobarber.local" }, new[] { standbyBarberEmail }),
            new RodeoChairSeed("เก้าอี้ 4", "เก้าอี้ประจำ", 4, new[] { "ple.barber@rodeobarber.local" }, new[] { standbyBarberEmail }),
            new RodeoChairSeed("เก้าอี้ 5", "หน้าทีวี", 5, new[] { "deaw.barber@rodeobarber.local" }, new[] { standbyBarberEmail })
        };
        var seededBarberByEmail = seededBarbers.ToDictionary(
            barber => barber.Email.ToLowerInvariant(),
            barber => barber.BarberId);
        var seededBarberIds = seededBarbers.Select(barber => barber.BarberId).ToList();
        var chairNames = chairSeeds.Select(chair => chair.Name).ToList();

        var existingChairs = await dbContext.Chairs
            .Where(chair => chairNames.Contains(chair.Name))
            .ToDictionaryAsync(chair => chair.Name, cancellationToken);

        var chairs = new List<Chair>();
        foreach (var seed in chairSeeds)
        {
            if (!existingChairs.TryGetValue(seed.Name, out var chair))
            {
                chair = new Chair
                {
                    Id = Guid.NewGuid(),
                    CreatedAt = now
                };

                dbContext.Chairs.Add(chair);
            }

            chair.Name = seed.Name;
            chair.Note = seed.Note;
            chair.SortOrder = seed.SortOrder;
            chair.IsActive = true;
            chair.UpdatedAt = now;
            chairs.Add(chair);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        var chairIds = chairs.Select(chair => chair.Id).ToList();
        await dbContext.BarberChairAssignments
            .Where(assignment => chairIds.Contains(assignment.ChairId)
                || seededBarberIds.Contains(assignment.BarberId))
            .ExecuteDeleteAsync(cancellationToken);

        var assignments = new List<BarberChairAssignment>();
        foreach (var seed in chairSeeds)
        {
            var chair = existingChairs.GetValueOrDefault(seed.Name)
                ?? chairs.First(existingChair => existingChair.Name == seed.Name);

            for (var index = 0; index < seed.PrimaryBarberEmails.Count; index++)
            {
                var barberEmail = seed.PrimaryBarberEmails[index];
                if (!seededBarberByEmail.TryGetValue(barberEmail, out var barberId))
                {
                    continue;
                }

                assignments.Add(new BarberChairAssignment
                {
                    Id = Guid.NewGuid(),
                    ChairId = chair.Id,
                    BarberId = barberId,
                    StartDate = new DateOnly(2026, 1, 1),
                    IsPrimary = true,
                    Note = seed.PrimaryBarberEmails.Count > 1
                        ? index == 0 ? "ช่างหลัก" : "ช่างรอง"
                        : seed.Note,
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }

            foreach (var barberEmail in seed.StandbyBarberEmails)
            {
                if (!seededBarberByEmail.TryGetValue(barberEmail, out var barberId))
                {
                    continue;
                }

                assignments.Add(new BarberChairAssignment
                {
                    Id = Guid.NewGuid(),
                    ChairId = chair.Id,
                    BarberId = barberId,
                    StartDate = new DateOnly(2026, 1, 1),
                    IsPrimary = false,
                    Note = "ช่างสำรองรอแทนเก้าอี้ว่าง",
                    CreatedAt = now,
                    UpdatedAt = now
                });
            }
        }

        dbContext.BarberChairAssignments.AddRange(assignments);
        await dbContext.SaveChangesAsync(cancellationToken);
        dbContext.ChangeTracker.Clear();
    }

    private sealed record RodeoBarberSeed(
        string FullName,
        string PhoneNumber,
        string Email,
        string Password,
        string Specialty,
        int ExperienceYears,
        string Bio,
        IReadOnlyList<int> WorkingDays,
        int? StandbyPriority);

    private sealed record RodeoChairSeed(
        string Name,
        string Note,
        int SortOrder,
        IReadOnlyList<string> PrimaryBarberEmails,
        IReadOnlyList<string> StandbyBarberEmails);
}
