using System.Globalization;
using QRCoder;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Services.Payments;

public class ThaiQrPaymentService : IThaiQrPaymentService
{
    public QrPaymentResult? CreatePromptPayQr(PaymentAccount paymentAccount, decimal amount)
    {
        var proxyId = NormalizeProxyId(paymentAccount);
        if (proxyId is null)
        {
            return null;
        }

        var payloadWithoutCrc =
            BuildField("00", "01")
            + BuildField("01", "12")
            + BuildField("29", BuildField("00", "A000000677010111") + BuildField("01", proxyId))
            + BuildField("58", "TH")
            + BuildField("53", "764")
            + BuildField("54", amount.ToString("0.00", CultureInfo.InvariantCulture))
            + "6304";

        var payload = payloadWithoutCrc + ComputeCrc16Ccitt(payloadWithoutCrc);

        using var generator = new QRCodeGenerator();
        using var data = generator.CreateQrCode(payload, QRCodeGenerator.ECCLevel.Q);
        var png = new PngByteQRCode(data);
        var bytes = png.GetGraphic(12);

        return new QrPaymentResult(payload, $"data:image/png;base64,{Convert.ToBase64String(bytes)}");
    }

    private static string? NormalizeProxyId(PaymentAccount paymentAccount)
    {
        var digits = new string(paymentAccount.AccountNumber.Where(char.IsDigit).ToArray());

        return paymentAccount.AccountType switch
        {
            PaymentAccountType.PromptPayPhone when digits.Length == 10 && digits.StartsWith('0') =>
                $"0066{digits[1..]}",
            PaymentAccountType.PromptPayNationalId when digits.Length == 13 => digits,
            _ => null
        };
    }

    private static string BuildField(string id, string value)
    {
        return $"{id}{value.Length:00}{value}";
    }

    private static string ComputeCrc16Ccitt(string value)
    {
        const ushort polynomial = 0x1021;
        ushort crc = 0xFFFF;

        foreach (var currentByte in value.Select(character => (byte)character))
        {
            crc ^= (ushort)(currentByte << 8);

            for (var bit = 0; bit < 8; bit++)
            {
                crc = (crc & 0x8000) != 0
                    ? (ushort)((crc << 1) ^ polynomial)
                    : (ushort)(crc << 1);
            }
        }

        return crc.ToString("X4", CultureInfo.InvariantCulture);
    }
}
