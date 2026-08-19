namespace RodeoBarberShop.Api.Contracts.Services;

public record UpdateServiceRequest(
    string Name,
    string? Description,
    decimal Price,
    int DurationMinutes,
    bool IsActive);
