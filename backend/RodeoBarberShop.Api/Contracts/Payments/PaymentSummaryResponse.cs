namespace RodeoBarberShop.Api.Contracts.Payments;

public record PaymentSummaryResponse(
    Guid BookingId,
    string BookingNumber,
    string BookingStatus,
    string PaymentStatus,
    decimal SubtotalAmount,
    decimal DiscountAmount,
    decimal TotalAmount,
    PaymentAccountSummaryResponse? PaymentAccount,
    string? QrPayload,
    string? QrImageDataUrl,
    IReadOnlyList<PaymentBookingServiceResponse> Services);
