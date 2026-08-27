namespace RodeoBarberShop.Api.Contracts.Chairs;

public record ChairResponse(
    Guid Id,
    string Name,
    string? Note,
    int SortOrder,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
