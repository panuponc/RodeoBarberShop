namespace RodeoBarberShop.Api.Entities;

public class ShopSetting
{
    public Guid Id { get; set; }
    public string ShopName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? PhoneNumber { get; set; }
    public string? FacebookUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? LineOfficial { get; set; }
    public string? WebsiteUrl { get; set; }
    public string? LogoUrl { get; set; }
    public TimeOnly OpeningTime { get; set; }
    public TimeOnly ClosingTime { get; set; }
    public int BookingAdvanceDays { get; set; }
    public int CancellationDeadlineHours { get; set; } = 1;
    public int SlotIntervalMinutes { get; set; } = 60;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
