namespace RodeoBarberShop.Api.Contracts.Leaves;

public record CreateLeaveRequest(string LeaveType, DateTimeOffset StartAt, DateTimeOffset EndAt, string Reason);
public record LeaveResponse(Guid Id, string LeaveType, DateTimeOffset StartAt, DateTimeOffset EndAt, string Reason, string Status, string? ReviewNote, DateTimeOffset? ReviewedAt, DateTimeOffset CreatedAt);
