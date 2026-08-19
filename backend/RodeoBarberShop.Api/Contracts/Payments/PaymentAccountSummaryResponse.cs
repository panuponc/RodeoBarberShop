namespace RodeoBarberShop.Api.Contracts.Payments;

public record PaymentAccountSummaryResponse(
    Guid Id,
    string AccountName,
    string AccountType,
    string AccountNumber,
    string? BankName);
