namespace RodeoBarberShop.Api.Contracts.PaymentAccounts;

public record PaymentAccountResponse(
    Guid Id,
    string AccountName,
    string AccountType,
    string AccountNumber,
    string? BankName,
    bool IsActive,
    bool IsDefault,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
