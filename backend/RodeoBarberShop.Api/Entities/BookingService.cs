namespace RodeoBarberShop.Api.Entities;

public class BookingService
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public Guid ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public decimal UnitPrice { get; set; }
    public int DurationMinutes { get; set; }
    public int Quantity { get; set; } = 1;
    public decimal LineTotal { get; set; }
    public bool AddedDuringService { get; set; }
    public Guid? AddedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Booking Booking { get; set; } = null!;
    public Service Service { get; set; } = null!;
    public User? AddedByUser { get; set; }
}
