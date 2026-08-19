namespace RodeoBarberShop.Api.Contracts.Auth;

public record CurrentUserResponse(
    Guid UserId,
    string Email,
    string Role);
