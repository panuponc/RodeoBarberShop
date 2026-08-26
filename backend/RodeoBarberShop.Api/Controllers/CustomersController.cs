using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Customers;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "FrontDeskStaff,Owner,Admin")]
public class CustomersController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet("lookup")]
    public async Task<ActionResult<IReadOnlyList<CustomerLookupResponse>>> Lookup(
        [FromQuery] string query,
        CancellationToken cancellationToken)
    {
        var normalizedQuery = query.Trim().ToLowerInvariant();
        if (normalizedQuery.Length < 2)
        {
            return Ok(Array.Empty<CustomerLookupResponse>());
        }

        var digitQuery = new string(normalizedQuery.Where(char.IsDigit).ToArray());

        var customers = await dbContext.Users
            .AsNoTracking()
            .Where(user => user.Role == UserRole.Customer
                && user.AccountStatus == AccountStatus.Active
                && (user.FullName.ToLower().Contains(normalizedQuery)
                    || user.Email.ToLower().Contains(normalizedQuery)
                    || user.PhoneNumber.Contains(normalizedQuery)
                    || (digitQuery.Length >= 2 && user.PhoneNumber.Contains(digitQuery))))
            .OrderBy(user => user.FullName)
            .Take(8)
            .Select(user => new CustomerLookupResponse(
                user.Id,
                user.FullName,
                user.PhoneNumber,
                user.Email))
            .ToListAsync(cancellationToken);

        return Ok(customers);
    }
}
