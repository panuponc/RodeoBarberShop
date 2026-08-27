namespace RodeoBarberShop.Api.Entities;

public class BarberChairAssignment
{
    public Guid Id { get; set; }
    public Guid ChairId { get; set; }
    public Guid BarberId { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool IsPrimary { get; set; } = true;
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Chair Chair { get; set; } = null!;
    public BarberProfile Barber { get; set; } = null!;
}
