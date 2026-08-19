namespace RodeoBarberShop.Api.Contracts.Auth;

public record RegisterRequest(
    string FullName,
    string PhoneNumber,
    string Email,
    string Password);
