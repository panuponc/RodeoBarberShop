namespace RodeoBarberShop.Api.Contracts.PaymentAccounts;

public record CreatePaymentAccountRequest(
    string AccountName,
    string AccountType,
    string AccountNumber,
    string? BankName,
    bool IsActive,
    bool IsDefault);
