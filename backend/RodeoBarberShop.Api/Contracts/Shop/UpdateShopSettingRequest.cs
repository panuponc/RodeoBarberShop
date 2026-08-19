namespace RodeoBarberShop.Api.Contracts.Shop;

public record UpdateShopSettingRequest(
    string ShopName,
    string? Address,
    string? PhoneNumber,
    string? FacebookUrl,
    string? InstagramUrl,
    string? LineOfficial,
    string? WebsiteUrl,
    string? LogoUrl,
    TimeOnly OpeningTime,
    TimeOnly ClosingTime,
    int BookingAdvanceDays,
    int CancellationDeadlineHours,
    int SlotIntervalMinutes);
