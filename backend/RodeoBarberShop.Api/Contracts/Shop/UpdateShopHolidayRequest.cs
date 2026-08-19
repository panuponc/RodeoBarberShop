namespace RodeoBarberShop.Api.Contracts.Shop;

public record UpdateShopHolidayRequest(
    string HolidayType,
    int? DayOfWeek,
    DateOnly? HolidayDate,
    string? Reason);
