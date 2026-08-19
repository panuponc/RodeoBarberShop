namespace RodeoBarberShop.Api.Contracts.Services;

public record CreateServiceRequest(
    string Name,
    string? Description,
    decimal Price,
    int DurationMinutes);
