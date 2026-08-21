using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Contracts.Staff;

public record CreateStaffRequest(
    string FullName,
    string? Nickname,
    string PhoneNumber,
    string Email,
    string Password,
    UserRole Role,
    DateOnly? StartDate,
    string? Note,
    string? Specialty,
    int? ExperienceYears,
    string? Bio,
    bool IsAvailable,
    bool AcceptsBooking);
