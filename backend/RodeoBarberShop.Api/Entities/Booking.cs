using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Entities;

public class Booking
{
    public Guid Id { get; set; }
    public string BookingNumber { get; set; } = string.Empty;
    public BookingSource BookingSource { get; set; }
    public Guid? CustomerId { get; set; }
    public string? GuestName { get; set; }
    public string? GuestPhoneNumber { get; set; }
    public string? GuestEmail { get; set; }
    public Guid? BarberId { get; set; }
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset EndAt { get; set; }
    public int EstimatedDurationMinutes { get; set; }
    public decimal SubtotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public BookingStatus BookingStatus { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Unpaid;
    public string? CustomerNote { get; set; }
    public string? CancelReason { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public DateTimeOffset? CheckedInAt { get; set; }
    public DateTimeOffset? ServiceStartedAt { get; set; }
    public DateTimeOffset? ServiceCompletedAt { get; set; }
    public Guid? CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public User? Customer { get; set; }
    public BarberProfile? Barber { get; set; }
    public User? CreatedByUser { get; set; }
    public ICollection<BookingService> BookingServices { get; set; } = [];
}
