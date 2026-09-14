namespace RodeoBarberShop.Api.Entities;

public class BarberBookingClosure
{
    public Guid Id { get; set; }
    public Guid BarberId { get; set; }
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset EndAt { get; set; }
    public string Reason { get; set; } = string.Empty;
    public Guid ClosedByUserId { get; set; }
    public Guid? ReopenedByUserId { get; set; }
    public DateTimeOffset? ReopenedAt { get; set; }
}
