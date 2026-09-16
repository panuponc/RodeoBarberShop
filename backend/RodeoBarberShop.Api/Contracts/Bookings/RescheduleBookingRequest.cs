namespace RodeoBarberShop.Api.Contracts.Bookings;

public record RescheduleBookingRequest(Guid BarberId, DateTimeOffset StartAt,
    DateTimeOffset ExpectedUpdatedAt, string Reason);
