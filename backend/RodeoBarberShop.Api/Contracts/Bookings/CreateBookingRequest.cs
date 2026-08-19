namespace RodeoBarberShop.Api.Contracts.Bookings;

public record CreateBookingRequest(
    Guid BarberId,
    DateTimeOffset StartAt,
    IReadOnlyList<Guid> ServiceIds,
    string? CustomerNote);
