namespace RodeoBarberShop.Api.Contracts.Shop;

public record CreateShopHolidayRequest(
    string HolidayType,
    int? DayOfWeek,
    DateOnly? HolidayDate,
    string? Reason);
