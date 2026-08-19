namespace RodeoBarberShop.Api.Contracts.Dev;

public record SeedOwnerResponse(
    Guid UserId,
    string FullName,
    string Email,
    string Role,
    bool Created);
