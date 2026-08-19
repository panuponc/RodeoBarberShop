namespace RodeoBarberShop.Api.Contracts.Services;

public record ServiceResponse(
    Guid Id,
    string Name,
    string? Description,
    decimal Price,
    int DurationMinutes,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
