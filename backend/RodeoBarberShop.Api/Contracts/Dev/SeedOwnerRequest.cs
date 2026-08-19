namespace RodeoBarberShop.Api.Contracts.Dev;

public record SeedOwnerRequest(
    string FullName,
    string PhoneNumber,
    string Email,
    string Password);
