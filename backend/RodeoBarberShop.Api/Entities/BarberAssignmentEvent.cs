namespace RodeoBarberShop.Api.Entities;

public class BarberAssignmentEvent
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public Guid? FromBarberId { get; set; }
    public Guid? ToBarberId { get; set; }
    public Guid ChangedByUserId { get; set; }
    public string? Reason { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Booking Booking { get; set; } = null!;
    public BarberProfile? FromBarber { get; set; }
    public BarberProfile? ToBarber { get; set; }
    public User ChangedByUser { get; set; } = null!;
}
