namespace RodeoBarberShop.Api.Contracts.Shop;

public record ShopHolidayResponse(
    Guid Id,
    string HolidayType,
    int? DayOfWeek,
    DateOnly? HolidayDate,
    string? Reason,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
