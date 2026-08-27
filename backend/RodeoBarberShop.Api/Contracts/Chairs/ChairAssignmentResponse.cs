namespace RodeoBarberShop.Api.Contracts.Chairs;

public record ChairAssignmentResponse(
    Guid Id,
    Guid ChairId,
    string ChairName,
    Guid BarberId,
    string BarberName,
    DateOnly StartDate,
    DateOnly? EndDate,
    bool IsPrimary,
    string? Note,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
