using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Entities;

public class Notification
{
    public Guid Id { get; set; }
    public Guid? RecipientUserId { get; set; }
    public UserRole? RecipientRole { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType NotificationType { get; set; }
    public Guid? RelatedBookingId { get; set; }
    public bool IsRead { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public User? RecipientUser { get; set; }
    public Booking? RelatedBooking { get; set; }
}
