namespace RodeoBarberShop.Api.Contracts.Chairs;

public record CreateChairRequest(
    string Name,
    string? Note,
    int SortOrder,
    bool IsActive);
