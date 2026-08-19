namespace RodeoBarberShop.Api.Contracts.Barbers;

public record BarberResponse(
    Guid Id,
    Guid UserId,
    string FullName,
    string? Nickname,
    string Email,
    string PhoneNumber,
    string? Specialty,
    int? ExperienceYears,
    string? Bio,
    bool IsAvailable,
    bool AcceptsBooking,
    IReadOnlyList<BarberServiceResponse> Services,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
