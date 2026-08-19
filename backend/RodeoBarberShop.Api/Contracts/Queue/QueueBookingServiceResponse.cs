namespace RodeoBarberShop.Api.Contracts.Queue;

public record QueueBookingServiceResponse(
    Guid ServiceId,
    string ServiceName,
    decimal UnitPrice,
    int DurationMinutes,
    int Quantity,
    decimal LineTotal);
