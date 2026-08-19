namespace RodeoBarberShop.Api.Contracts.Dev;

public record SeedBarberRequest(
    string FullName,
    string PhoneNumber,
    string Email,
    string Password,
    string? Specialty,
    int? ExperienceYears,
    string? Bio);
