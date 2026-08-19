using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Services;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;

namespace RodeoBarberShop.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServicesController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ServiceResponse>>> GetServices(CancellationToken cancellationToken)
    {
        var services = await dbContext.Services
            .AsNoTracking()
            .Where(service => service.IsActive)
            .OrderBy(service => service.Name)
            .Select(service => ToResponse(service))
            .ToListAsync(cancellationToken);

        return Ok(services);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServiceResponse>> GetService(Guid id, CancellationToken cancellationToken)
    {
        var service = await dbContext.Services
            .AsNoTracking()
            .Where(service => service.Id == id && service.IsActive)
            .Select(service => ToResponse(service))
            .FirstOrDefaultAsync(cancellationToken);

        return service is null ? NotFound() : Ok(service);
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPost]
    public async Task<ActionResult<ServiceResponse>> CreateService(
        CreateServiceRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateService(request.Name, request.Price, request.DurationMinutes);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var now = DateTimeOffset.UtcNow;
        var service = new Service
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = NormalizeOptionalText(request.Description),
            Price = request.Price,
            DurationMinutes = request.DurationMinutes,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.Services.Add(service);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = ToResponse(service);
        return CreatedAtAction(nameof(GetService), new { id = service.Id }, response);
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ServiceResponse>> UpdateService(
        Guid id,
        UpdateServiceRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateService(request.Name, request.Price, request.DurationMinutes);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var service = await dbContext.Services.FirstOrDefaultAsync(service => service.Id == id, cancellationToken);
        if (service is null)
        {
            return NotFound();
        }

        service.Name = request.Name.Trim();
        service.Description = NormalizeOptionalText(request.Description);
        service.Price = request.Price;
        service.DurationMinutes = request.DurationMinutes;
        service.IsActive = request.IsActive;
        service.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(service));
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteService(Guid id, CancellationToken cancellationToken)
    {
        var service = await dbContext.Services.FirstOrDefaultAsync(service => service.Id == id, cancellationToken);
        if (service is null)
        {
            return NotFound();
        }

        service.IsActive = false;
        service.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private static ServiceResponse ToResponse(Service service)
    {
        return new ServiceResponse(
            service.Id,
            service.Name,
            service.Description,
            service.Price,
            service.DurationMinutes,
            service.IsActive,
            service.CreatedAt,
            service.UpdatedAt);
    }

    private static string? ValidateService(string name, decimal price, int durationMinutes)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return "Service name is required.";
        }

        if (name.Trim().Length > 150)
        {
            return "Service name must be 150 characters or fewer.";
        }

        if (price < 0)
        {
            return "Service price must be zero or greater.";
        }

        if (durationMinutes <= 0)
        {
            return "Service duration must be greater than zero.";
        }

        return null;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
