namespace RodeoBarberShop.Api.Entities;

public class LeaveEvent
{
    public Guid Id { get; set; }
    public Guid LeaveRequestId { get; set; }
    public Guid ActorUserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public LeaveRequest LeaveRequest { get; set; } = null!;
}
