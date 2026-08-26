namespace RodeoBarberShop.Api.Contracts.Customers;

public record CustomerLookupResponse(
    Guid Id,
    string FullName,
    string PhoneNumber,
    string Email);
