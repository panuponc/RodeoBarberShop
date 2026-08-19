namespace RodeoBarberShop.Api.Contracts.PaymentAccounts;

public record PreviewPaymentQrResponse(
    Guid PaymentAccountId,
    string AccountName,
    decimal Amount,
    string QrPayload,
    string QrImageDataUrl);
