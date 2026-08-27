namespace RodeoBarberShop.Api.Contracts.Chairs;

public record UpdateChairRequest(
    string Name,
    string? Note,
    int SortOrder,
    bool IsActive);
