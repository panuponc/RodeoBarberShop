using RodeoBarberShop.Api.Entities;

namespace RodeoBarberShop.Api.Services.Payments;

public interface IThaiQrPaymentService
{
    QrPaymentResult? CreatePromptPayQr(PaymentAccount paymentAccount, decimal amount);
}
