namespace RodeoBarberShop.Api.Contracts.PaymentAccounts;

public record UpdatePaymentAccountRequest(
    string AccountName,
    string AccountType,
    string AccountNumber,
    string? BankName,
    bool IsActive,
    bool IsDefault);
