namespace RodeoBarberShop.Api.Contracts.Barbers;

public record UpdateBarberRequest(
    string FullName,
    string? Nickname,
    string PhoneNumber,
    string? Specialty,
    int? ExperienceYears,
    string? Bio,
    bool IsAvailable,
    bool AcceptsBooking,
    IReadOnlyList<Guid> ServiceIds);
