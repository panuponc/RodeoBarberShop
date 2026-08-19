namespace RodeoBarberShop.Api.Contracts.Dev;

public record SeedBarberResponse(
    Guid UserId,
    Guid BarberId,
    string FullName,
    string Email,
    string Role,
    bool Created);
