namespace RodeoBarberShop.Api.Contracts.Leaves;

public record CreateLeaveRequest(string LeaveType, DateTimeOffset StartAt, DateTimeOffset EndAt, string Reason);
public record LeaveResponse(Guid Id, string LeaveType, DateTimeOffset StartAt, DateTimeOffset EndAt, string Reason, string Status, string? ReviewNote, DateTimeOffset? ReviewedAt, DateTimeOffset CreatedAt)
{
    public IReadOnlyList<LeaveEventResponse> History { get; init; } = [];
}
public record LeaveEventResponse(Guid Id, Guid ActorUserId, string Action, string? Note, DateTimeOffset CreatedAt);
public record CancelLeaveRequest(string? Note);
public record ManagedLeaveResponse(LeaveResponse Leave, Guid BarberId, string BarberName, string? ReviewerName, int AffectedBookingCount);
public record AffectedLeaveBooking(Guid Id, string BookingNumber, string? CustomerName, DateTimeOffset StartAt, DateTimeOffset EndAt, string Status);
public record ReviewLeaveRequest(string? Note, List<Guid>? AffectedBookingIds);
