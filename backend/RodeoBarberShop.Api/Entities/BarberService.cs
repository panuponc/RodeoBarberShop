namespace RodeoBarberShop.Api.Entities;

public class BarberService
{
    public Guid Id { get; set; }
    public Guid BarberId { get; set; }
    public Guid ServiceId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public BarberProfile Barber { get; set; } = null!;
    public Service Service { get; set; } = null!;
}
