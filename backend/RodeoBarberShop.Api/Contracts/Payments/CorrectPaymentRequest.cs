using System.ComponentModel.DataAnnotations;

namespace RodeoBarberShop.Api.Contracts.Payments;

public record CorrectPaymentRequest([Required, StringLength(500, MinimumLength = 3)] string Reason);
