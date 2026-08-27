namespace RodeoBarberShop.Api.Contracts.Chairs;

public record UpdateChairAssignmentRequest(
    Guid ChairId,
    Guid BarberId,
    DateOnly StartDate,
    DateOnly? EndDate,
    bool IsPrimary,
    string? Note);
