using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Entities;

public class User
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Nickname { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public AccountStatus AccountStatus { get; set; } = AccountStatus.Active;
    public string? ProfileImageUrl { get; set; }
    public DateOnly? StartDate { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public CustomerProfile? CustomerProfile { get; set; }
    public BarberProfile? BarberProfile { get; set; }
    public ICollection<Booking> CustomerBookings { get; set; } = [];
    public ICollection<Booking> CreatedBookings { get; set; } = [];
    public ICollection<LeaveRequest> ReviewedLeaveRequests { get; set; } = [];
    public ICollection<Payment> ReceivedPayments { get; set; } = [];
    public ICollection<Notification> Notifications { get; set; } = [];
    public ICollection<QueueEvent> QueueEvents { get; set; } = [];
    public ICollection<BarberAssignmentEvent> BarberAssignmentEvents { get; set; } = [];
}
