namespace RodeoBarberShop.Api.Contracts.Bookings;

public record BookingResponse(
    Guid Id,
    string BookingNumber,
    string BookingSource,
    Guid? CustomerId,
    string? CustomerName,
    Guid? BarberId,
    string? BarberName,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    int EstimatedDurationMinutes,
    decimal SubtotalAmount,
    decimal DiscountAmount,
    decimal TotalAmount,
    string BookingStatus,
    string PaymentStatus,
    string? CustomerNote,
    string? CancelReason,
    IReadOnlyList<BookingServiceResponse> Services,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
