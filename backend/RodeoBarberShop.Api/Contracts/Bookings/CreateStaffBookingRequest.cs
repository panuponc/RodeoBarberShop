namespace RodeoBarberShop.Api.Contracts.Bookings;

public record CreateStaffBookingRequest(
    string GuestName,
    string GuestPhoneNumber,
    string? GuestEmail,
    Guid BarberId,
    DateTimeOffset StartAt,
    IReadOnlyList<Guid> ServiceIds,
    string? CustomerNote);
