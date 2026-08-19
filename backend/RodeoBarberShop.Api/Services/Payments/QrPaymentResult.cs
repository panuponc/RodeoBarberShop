namespace RodeoBarberShop.Api.Services.Payments;

public record QrPaymentResult(
    string Payload,
    string ImageDataUrl);
