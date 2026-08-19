namespace RodeoBarberShop.Api.Contracts.Bookings;

public record BookingServiceResponse(
    Guid ServiceId,
    string ServiceName,
    decimal UnitPrice,
    int DurationMinutes,
    int Quantity,
    decimal LineTotal);
