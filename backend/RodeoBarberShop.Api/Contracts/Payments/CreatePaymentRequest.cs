namespace RodeoBarberShop.Api.Contracts.Payments;

public record CreatePaymentRequest(
    Guid BookingId,
    Guid? PaymentAccountId,
    string PaymentMethod,
    string? Note);
