using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Entities;

public class LeaveRequest
{
    public Guid Id { get; set; }
    public Guid BarberId { get; set; }
    public string LeaveType { get; set; } = string.Empty;
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset EndAt { get; set; }
    public string Reason { get; set; } = string.Empty;
    public LeaveStatus Status { get; set; } = LeaveStatus.Pending;
    public Guid? ReviewedByUserId { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public string? ReviewNote { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public BarberProfile Barber { get; set; } = null!;
    public User? ReviewedByUser { get; set; }
}
