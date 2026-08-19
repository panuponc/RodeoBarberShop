namespace RodeoBarberShop.Api.Contracts.Queue;

public record UpdateQueueStatusResponse(
    QueueBookingResponse Booking,
    QueueEventResponse Event);
