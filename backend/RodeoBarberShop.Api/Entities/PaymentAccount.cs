using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Entities;

public class PaymentAccount
{
    public Guid Id { get; set; }
    public string AccountName { get; set; } = string.Empty;
    public PaymentAccountType AccountType { get; set; }
    public string AccountNumber { get; set; } = string.Empty;
    public string? BankName { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsDefault { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<Payment> Payments { get; set; } = [];
}
