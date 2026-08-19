namespace RodeoBarberShop.Api.Contracts.Payments;

public record PaymentResponse(
    Guid Id,
    Guid BookingId,
    string BookingNumber,
    Guid? PaymentAccountId,
    string PaymentNumber,
    string PaymentMethod,
    string PaymentStatus,
    decimal SubtotalAmount,
    decimal DiscountAmount,
    decimal TotalAmount,
    DateTimeOffset PaidAt,
    Guid ReceivedByUserId,
    string? Note,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
