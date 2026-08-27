namespace RodeoBarberShop.Api.Contracts.Chairs;

public record ChairScheduleResponse(
    Guid Id,
    string Name,
    string? Note,
    int SortOrder,
    bool IsActive,
    IReadOnlyList<ChairScheduleBarberResponse> Barbers);
