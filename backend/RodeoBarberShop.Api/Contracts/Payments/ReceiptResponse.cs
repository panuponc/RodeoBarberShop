namespace RodeoBarberShop.Api.Contracts.Payments;

public record ReceiptResponse(
    Guid PaymentId,
    string PaymentNumber,
    string BookingNumber,
    string ShopName,
    string? ShopAddress,
    string? ShopPhoneNumber,
    string? CustomerName,
    string? BarberName,
    DateTimeOffset PaidAt,
    string PaymentMethod,
    decimal SubtotalAmount,
    decimal DiscountAmount,
    decimal TotalAmount,
    IReadOnlyList<PaymentBookingServiceResponse> Services);
