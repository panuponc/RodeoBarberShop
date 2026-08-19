using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Entities;

public class QueueEvent
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public BookingStatus? FromStatus { get; set; }
    public BookingStatus ToStatus { get; set; }
    public Guid? ChangedByUserId { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Booking Booking { get; set; } = null!;
    public User? ChangedByUser { get; set; }
}
