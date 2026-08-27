namespace RodeoBarberShop.Api.Contracts.Chairs;

public record CreateChairAssignmentRequest(
    Guid BarberId,
    DateOnly StartDate,
    DateOnly? EndDate,
    bool IsPrimary,
    string? Note);
