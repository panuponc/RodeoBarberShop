using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Contracts.Staff;

public record StaffResponse(
    Guid Id,
    Guid? BarberProfileId,
    string FullName,
    string? Nickname,
    string Email,
    string PhoneNumber,
    UserRole Role,
    AccountStatus AccountStatus,
    DateOnly? StartDate,
    string? Note,
    string? Specialty,
    int? ExperienceYears,
    string? Bio,
    bool IsAvailable,
    bool AcceptsBooking,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
