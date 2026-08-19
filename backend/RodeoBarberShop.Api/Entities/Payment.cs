using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Entities;

public class Payment
{
    public Guid Id { get; set; }
    public Guid BookingId { get; set; }
    public Guid? PaymentAccountId { get; set; }
    public string PaymentNumber { get; set; } = string.Empty;
    public PaymentMethod PaymentMethod { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Paid;
    public decimal SubtotalAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTimeOffset PaidAt { get; set; }
    public Guid ReceivedByUserId { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Booking Booking { get; set; } = null!;
    public PaymentAccount? PaymentAccount { get; set; }
    public User ReceivedByUser { get; set; } = null!;
}
