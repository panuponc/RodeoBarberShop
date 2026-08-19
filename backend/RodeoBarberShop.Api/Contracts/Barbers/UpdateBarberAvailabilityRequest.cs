namespace RodeoBarberShop.Api.Contracts.Barbers;

public record UpdateBarberAvailabilityRequest(
    bool IsAvailable,
    bool AcceptsBooking);
