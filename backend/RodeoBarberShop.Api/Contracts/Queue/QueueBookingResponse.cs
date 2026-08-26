namespace RodeoBarberShop.Api.Contracts.Queue;

public record QueueBookingResponse(
    Guid Id,
    string BookingNumber,
    Guid? CustomerId,
    string? CustomerName,
    Guid? BarberId,
    string? BarberName,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    int EstimatedDurationMinutes,
    decimal TotalAmount,
    string BookingStatus,
    string PaymentStatus,
    string? CancelReason,
    DateTimeOffset? CancelledAt,
    IReadOnlyList<QueueBookingServiceResponse> Services);
