namespace RodeoBarberShop.Api.Contracts.Barbers;

public record UpdateOwnBarberProfileRequest(
    string FullName,
    string? Nickname,
    string PhoneNumber,
    string? Specialty,
    int? ExperienceYears,
    string? Bio,
    bool IsAvailable,
    bool AcceptsBooking);
