namespace RodeoBarberShop.Api.Contracts.Chairs;

public record ChairScheduleBarberResponse(
    Guid AssignmentId,
    Guid BarberId,
    string FullName,
    string? Nickname,
    string Email,
    bool IsPrimary,
    string? AssignmentNote,
    DateOnly StartDate,
    DateOnly? EndDate);
