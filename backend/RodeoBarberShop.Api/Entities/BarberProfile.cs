namespace RodeoBarberShop.Api.Entities;

public class BarberProfile
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? Specialty { get; set; }
    public int? ExperienceYears { get; set; }
    public string? Bio { get; set; }
    public bool IsAvailable { get; set; } = true;
    public bool AcceptsBooking { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public User User { get; set; } = null!;
    public ICollection<Booking> Bookings { get; set; } = [];
}
