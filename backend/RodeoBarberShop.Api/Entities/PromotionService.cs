namespace RodeoBarberShop.Api.Entities;

public class PromotionService
{
    public Guid Id { get; set; }
    public Guid PromotionId { get; set; }
    public Guid ServiceId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public Promotion Promotion { get; set; } = null!;
    public Service Service { get; set; } = null!;
}
