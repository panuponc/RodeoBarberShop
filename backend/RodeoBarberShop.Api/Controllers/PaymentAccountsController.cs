using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.PaymentAccounts;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;
using RodeoBarberShop.Api.Services.Payments;

namespace RodeoBarberShop.Api.Controllers;

[ApiController]
[Route("api/payment-accounts")]
[Authorize(Roles = "Owner,Admin")]
public class PaymentAccountsController(
    ApplicationDbContext dbContext,
    IThaiQrPaymentService thaiQrPaymentService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PaymentAccountResponse>>> GetPaymentAccounts(CancellationToken cancellationToken)
    {
        var accounts = await dbContext.PaymentAccounts
            .AsNoTracking()
            .OrderByDescending(account => account.IsDefault)
            .ThenBy(account => account.AccountName)
            .Select(account => ToResponse(account))
            .ToListAsync(cancellationToken);

        return Ok(accounts);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PaymentAccountResponse>> GetPaymentAccount(Guid id, CancellationToken cancellationToken)
    {
        var account = await dbContext.PaymentAccounts
            .AsNoTracking()
            .Where(account => account.Id == id)
            .Select(account => ToResponse(account))
            .FirstOrDefaultAsync(cancellationToken);

        return account is null ? NotFound() : Ok(account);
    }

    [HttpPost]
    public async Task<ActionResult<PaymentAccountResponse>> CreatePaymentAccount(
        CreatePaymentAccountRequest request,
        CancellationToken cancellationToken)
    {
        var parsedAccount = ParseAccount(request.AccountType, request.AccountName, request.AccountNumber);
        if (parsedAccount.Error is not null)
        {
            return BadRequest(new { message = parsedAccount.Error });
        }

        var now = DateTimeOffset.UtcNow;
        var account = new PaymentAccount
        {
            Id = Guid.NewGuid(),
            AccountName = request.AccountName.Trim(),
            AccountType = parsedAccount.AccountType,
            AccountNumber = request.AccountNumber.Trim(),
            BankName = NormalizeOptionalText(request.BankName),
            IsActive = request.IsActive,
            IsDefault = request.IsDefault,
            CreatedAt = now,
            UpdatedAt = now
        };

        if (account.IsDefault)
        {
            await ClearDefaultAccounts(cancellationToken);
        }

        dbContext.PaymentAccounts.Add(account);
        await dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetPaymentAccount), new { id = account.Id }, ToResponse(account));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PaymentAccountResponse>> UpdatePaymentAccount(
        Guid id,
        UpdatePaymentAccountRequest request,
        CancellationToken cancellationToken)
    {
        var parsedAccount = ParseAccount(request.AccountType, request.AccountName, request.AccountNumber);
        if (parsedAccount.Error is not null)
        {
            return BadRequest(new { message = parsedAccount.Error });
        }

        var account = await dbContext.PaymentAccounts.FirstOrDefaultAsync(account => account.Id == id, cancellationToken);
        if (account is null)
        {
            return NotFound();
        }

        if (request.IsDefault)
        {
            await ClearDefaultAccounts(cancellationToken);
        }

        account.AccountName = request.AccountName.Trim();
        account.AccountType = parsedAccount.AccountType;
        account.AccountNumber = request.AccountNumber.Trim();
        account.BankName = NormalizeOptionalText(request.BankName);
        account.IsActive = request.IsActive;
        account.IsDefault = request.IsDefault;
        account.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(account));
    }

    [HttpPut("{id:guid}/default")]
    public async Task<ActionResult<PaymentAccountResponse>> SetDefaultPaymentAccount(Guid id, CancellationToken cancellationToken)
    {
        var account = await dbContext.PaymentAccounts.FirstOrDefaultAsync(account => account.Id == id, cancellationToken);
        if (account is null)
        {
            return NotFound();
        }

        if (!account.IsActive)
        {
            return BadRequest(new { message = "Inactive payment account cannot be set as default." });
        }

        await ClearDefaultAccounts(cancellationToken);
        account.IsDefault = true;
        account.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(account));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePaymentAccount(Guid id, CancellationToken cancellationToken)
    {
        var account = await dbContext.PaymentAccounts.FirstOrDefaultAsync(account => account.Id == id, cancellationToken);
        if (account is null)
        {
            return NotFound();
        }

        account.IsActive = false;
        account.IsDefault = false;
        account.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    [HttpPost("qr-preview")]
    public async Task<ActionResult<PreviewPaymentQrResponse>> PreviewDefaultPaymentQr(
        PreviewPaymentQrRequest request,
        CancellationToken cancellationToken)
    {
        var account = await dbContext.PaymentAccounts
            .FirstOrDefaultAsync(
                account => account.IsActive
                    && account.IsDefault
                    && (account.AccountType == PaymentAccountType.PromptPayPhone
                        || account.AccountType == PaymentAccountType.PromptPayNationalId),
                cancellationToken);

        return account is null
            ? BadRequest(new { message = "No active default PromptPay account is available." })
            : CreateQrPreview(account, request.Amount);
    }

    [HttpPost("{id:guid}/qr-preview")]
    public async Task<ActionResult<PreviewPaymentQrResponse>> PreviewPaymentQr(
        Guid id,
        PreviewPaymentQrRequest request,
        CancellationToken cancellationToken)
    {
        var account = await dbContext.PaymentAccounts
            .FirstOrDefaultAsync(account => account.Id == id, cancellationToken);

        if (account is null)
        {
            return NotFound();
        }

        if (!account.IsActive)
        {
            return BadRequest(new { message = "Payment account is inactive." });
        }

        return CreateQrPreview(account, request.Amount);
    }

    private async Task ClearDefaultAccounts(CancellationToken cancellationToken)
    {
        await dbContext.PaymentAccounts
            .Where(account => account.IsDefault)
            .ExecuteUpdateAsync(
                updates => updates
                    .SetProperty(account => account.IsDefault, false)
                    .SetProperty(account => account.UpdatedAt, DateTimeOffset.UtcNow),
                cancellationToken);
    }

    private static PaymentAccountResponse ToResponse(PaymentAccount account)
    {
        return new PaymentAccountResponse(
            account.Id,
            account.AccountName,
            account.AccountType.ToString(),
            account.AccountNumber,
            account.BankName,
            account.IsActive,
            account.IsDefault,
            account.CreatedAt,
            account.UpdatedAt);
    }

    private ActionResult<PreviewPaymentQrResponse> CreateQrPreview(PaymentAccount account, decimal amount)
    {
        if (amount <= 0)
        {
            return BadRequest(new { message = "Amount must be greater than zero." });
        }

        var qr = thaiQrPaymentService.CreatePromptPayQr(account, amount);
        if (qr is null)
        {
            return BadRequest(new { message = "QR preview supports active PromptPay phone or national id accounts only." });
        }

        return Ok(new PreviewPaymentQrResponse(account.Id, account.AccountName, amount, qr.Payload, qr.ImageDataUrl));
    }

    private static ParsedAccount ParseAccount(string accountType, string accountName, string accountNumber)
    {
        if (string.IsNullOrWhiteSpace(accountName))
        {
            return new ParsedAccount(PaymentAccountType.BankAccount, "Account name is required.");
        }

        if (string.IsNullOrWhiteSpace(accountNumber))
        {
            return new ParsedAccount(PaymentAccountType.BankAccount, "Account number is required.");
        }

        if (!Enum.TryParse<PaymentAccountType>(accountType, ignoreCase: true, out var parsedType))
        {
            return new ParsedAccount(PaymentAccountType.BankAccount, "Account type is invalid.");
        }

        var digits = new string(accountNumber.Where(char.IsDigit).ToArray());
        if (parsedType == PaymentAccountType.PromptPayPhone && digits.Length != 10)
        {
            return new ParsedAccount(parsedType, "PromptPay phone must contain 10 digits.");
        }

        if (parsedType == PaymentAccountType.PromptPayNationalId && digits.Length != 13)
        {
            return new ParsedAccount(parsedType, "PromptPay national id must contain 13 digits.");
        }

        return new ParsedAccount(parsedType, null);
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private record ParsedAccount(PaymentAccountType AccountType, string? Error);
}
