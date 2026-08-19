namespace RodeoBarberShop.Api.Contracts.Auth;

public record AuthResponse(
    Guid UserId,
    string FullName,
    string Email,
    string Role,
    string AccessToken);
