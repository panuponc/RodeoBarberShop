namespace RodeoBarberShop.Api.Contracts.Payments;

public record PaymentBookingServiceResponse(
    Guid ServiceId,
    string ServiceName,
    decimal UnitPrice,
    int DurationMinutes,
    int Quantity,
    decimal LineTotal);
