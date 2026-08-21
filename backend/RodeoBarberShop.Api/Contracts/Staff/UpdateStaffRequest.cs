using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Contracts.Staff;

public record UpdateStaffRequest(
    string FullName,
    string? Nickname,
    string PhoneNumber,
    UserRole Role,
    AccountStatus AccountStatus,
    DateOnly? StartDate,
    string? Note,
    string? Specialty,
    int? ExperienceYears,
    string? Bio,
    bool IsAvailable,
    bool AcceptsBooking);
