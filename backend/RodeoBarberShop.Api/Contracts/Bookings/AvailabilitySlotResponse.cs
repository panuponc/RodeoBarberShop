namespace RodeoBarberShop.Api.Contracts.Bookings;

public record AvailabilitySlotResponse(
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    bool IsAvailable);
