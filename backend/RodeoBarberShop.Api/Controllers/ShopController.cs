using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Shop;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Controllers;

[ApiController]
[Route("api/shop")]
public class ShopController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ShopSettingResponse>> GetShop(CancellationToken cancellationToken)
    {
        var setting = await dbContext.ShopSettings
            .AsNoTracking()
            .OrderBy(setting => setting.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        return setting is null ? NotFound(new { message = "Shop setting has not been created." }) : Ok(ToResponse(setting));
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPut]
    public async Task<ActionResult<ShopSettingResponse>> UpdateShop(
        UpdateShopSettingRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateShopSetting(request);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var setting = await dbContext.ShopSettings
            .OrderBy(setting => setting.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;

        if (setting is null)
        {
            setting = new ShopSetting
            {
                Id = Guid.NewGuid(),
                CreatedAt = now
            };

            dbContext.ShopSettings.Add(setting);
        }

        setting.ShopName = request.ShopName.Trim();
        setting.Address = NormalizeOptionalText(request.Address);
        setting.PhoneNumber = NormalizeOptionalText(request.PhoneNumber);
        setting.FacebookUrl = NormalizeOptionalText(request.FacebookUrl);
        setting.InstagramUrl = NormalizeOptionalText(request.InstagramUrl);
        setting.LineOfficial = NormalizeOptionalText(request.LineOfficial);
        setting.WebsiteUrl = NormalizeOptionalText(request.WebsiteUrl);
        setting.LogoUrl = NormalizeOptionalText(request.LogoUrl);
        setting.OpeningTime = request.OpeningTime;
        setting.ClosingTime = request.ClosingTime;
        setting.BookingAdvanceDays = request.BookingAdvanceDays;
        setting.CancellationDeadlineHours = request.CancellationDeadlineHours;
        setting.SlotIntervalMinutes = request.SlotIntervalMinutes;
        setting.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(setting));
    }

    [HttpGet("holidays")]
    public async Task<ActionResult<IReadOnlyList<ShopHolidayResponse>>> GetHolidays(CancellationToken cancellationToken)
    {
        var holidays = await dbContext.ShopHolidays
            .AsNoTracking()
            .OrderBy(holiday => holiday.HolidayType)
            .ThenBy(holiday => holiday.DayOfWeek)
            .ThenBy(holiday => holiday.HolidayDate)
            .Select(holiday => ToResponse(holiday))
            .ToListAsync(cancellationToken);

        return Ok(holidays);
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPost("holidays")]
    public async Task<ActionResult<ShopHolidayResponse>> CreateHoliday(
        CreateShopHolidayRequest request,
        CancellationToken cancellationToken)
    {
        var parsedHoliday = ParseHoliday(request.HolidayType, request.DayOfWeek, request.HolidayDate);
        if (parsedHoliday.Error is not null)
        {
            return BadRequest(new { message = parsedHoliday.Error });
        }

        var now = DateTimeOffset.UtcNow;
        var holiday = new ShopHoliday
        {
            Id = Guid.NewGuid(),
            HolidayType = parsedHoliday.HolidayType,
            DayOfWeek = request.DayOfWeek,
            HolidayDate = request.HolidayDate,
            Reason = NormalizeOptionalText(request.Reason),
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.ShopHolidays.Add(holiday);
        await dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetHolidays), ToResponse(holiday));
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPut("holidays/{id:guid}")]
    public async Task<ActionResult<ShopHolidayResponse>> UpdateHoliday(
        Guid id,
        UpdateShopHolidayRequest request,
        CancellationToken cancellationToken)
    {
        var parsedHoliday = ParseHoliday(request.HolidayType, request.DayOfWeek, request.HolidayDate);
        if (parsedHoliday.Error is not null)
        {
            return BadRequest(new { message = parsedHoliday.Error });
        }

        var holiday = await dbContext.ShopHolidays.FirstOrDefaultAsync(holiday => holiday.Id == id, cancellationToken);
        if (holiday is null)
        {
            return NotFound();
        }

        holiday.HolidayType = parsedHoliday.HolidayType;
        holiday.DayOfWeek = request.DayOfWeek;
        holiday.HolidayDate = request.HolidayDate;
        holiday.Reason = NormalizeOptionalText(request.Reason);
        holiday.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(holiday));
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpDelete("holidays/{id:guid}")]
    public async Task<IActionResult> DeleteHoliday(Guid id, CancellationToken cancellationToken)
    {
        var holiday = await dbContext.ShopHolidays.FirstOrDefaultAsync(holiday => holiday.Id == id, cancellationToken);
        if (holiday is null)
        {
            return NotFound();
        }

        dbContext.ShopHolidays.Remove(holiday);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private static ShopSettingResponse ToResponse(ShopSetting setting)
    {
        return new ShopSettingResponse(
            setting.Id,
            setting.ShopName,
            setting.Address,
            setting.PhoneNumber,
            setting.FacebookUrl,
            setting.InstagramUrl,
            setting.LineOfficial,
            setting.WebsiteUrl,
            setting.LogoUrl,
            setting.OpeningTime,
            setting.ClosingTime,
            setting.BookingAdvanceDays,
            setting.CancellationDeadlineHours,
            setting.SlotIntervalMinutes,
            setting.CreatedAt,
            setting.UpdatedAt);
    }

    private static ShopHolidayResponse ToResponse(ShopHoliday holiday)
    {
        return new ShopHolidayResponse(
            holiday.Id,
            holiday.HolidayType.ToString(),
            holiday.DayOfWeek,
            holiday.HolidayDate,
            holiday.Reason,
            holiday.CreatedAt,
            holiday.UpdatedAt);
    }

    private static string? ValidateShopSetting(UpdateShopSettingRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ShopName))
        {
            return "Shop name is required.";
        }

        if (request.OpeningTime >= request.ClosingTime)
        {
            return "Opening time must be before closing time.";
        }

        if (request.BookingAdvanceDays <= 0)
        {
            return "Booking advance days must be greater than zero.";
        }

        if (request.CancellationDeadlineHours < 0)
        {
            return "Cancellation deadline hours must be zero or greater.";
        }

        if (request.SlotIntervalMinutes <= 0)
        {
            return "Slot interval minutes must be greater than zero.";
        }

        return null;
    }

    private static ParsedHoliday ParseHoliday(string holidayType, int? dayOfWeek, DateOnly? holidayDate)
    {
        if (!Enum.TryParse<HolidayType>(holidayType, ignoreCase: true, out var parsedHolidayType))
        {
            return new ParsedHoliday(HolidayType.Weekly, "Holiday type must be Weekly or Special.");
        }

        return parsedHolidayType switch
        {
            HolidayType.Weekly when dayOfWeek is null or < 0 or > 6 =>
                new ParsedHoliday(parsedHolidayType, "Weekly holiday requires dayOfWeek between 0 and 6."),
            HolidayType.Weekly when holidayDate is not null =>
                new ParsedHoliday(parsedHolidayType, "Weekly holiday must not include holidayDate."),
            HolidayType.Special when holidayDate is null =>
                new ParsedHoliday(parsedHolidayType, "Special holiday requires holidayDate."),
            HolidayType.Special when dayOfWeek is not null =>
                new ParsedHoliday(parsedHolidayType, "Special holiday must not include dayOfWeek."),
            _ => new ParsedHoliday(parsedHolidayType, null)
        };
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private record ParsedHoliday(HolidayType HolidayType, string? Error);
}
