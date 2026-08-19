namespace RodeoBarberShop.Api.Contracts.Barbers;

public record BarberServiceResponse(
    Guid ServiceId,
    string Name,
    decimal Price,
    int DurationMinutes);
