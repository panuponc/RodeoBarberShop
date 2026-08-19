using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Entities;

public class ShopHoliday
{
    public Guid Id { get; set; }
    public HolidayType HolidayType { get; set; }
    public int? DayOfWeek { get; set; }
    public DateOnly? HolidayDate { get; set; }
    public string? Reason { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
