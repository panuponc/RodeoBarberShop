namespace RodeoBarberShop.Api.Contracts.Chairs;

public record ChairScheduleResponse(
    Guid Id,
    string Name,
    string? Note,
    int SortOrder,
    bool IsActive,
    IReadOnlyList<ChairScheduleBarberResponse> Barbers)
{
    public IReadOnlyList<ScheduleLeaveResponse> Leaves { get; init; } = [];
    public IReadOnlyList<ScheduleLeaveResponse> BookingClosures { get; init; } = [];
}

public record ScheduleLeaveResponse(Guid Id, Guid BarberId, DateTimeOffset StartAt, DateTimeOffset EndAt);
