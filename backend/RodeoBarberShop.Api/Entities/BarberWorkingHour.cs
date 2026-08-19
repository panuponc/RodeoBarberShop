namespace RodeoBarberShop.Api.Entities;

public class BarberWorkingHour
{
    public Guid Id { get; set; }
    public Guid BarberId { get; set; }
    public int DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool IsWorkingDay { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public BarberProfile Barber { get; set; } = null!;
}
