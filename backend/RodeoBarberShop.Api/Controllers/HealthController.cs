using Microsoft.AspNetCore.Mvc;

namespace RodeoBarberShop.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new
        {
            status = "Healthy",
            service = "Rodeo Barber Shop API",
            timestamp = DateTimeOffset.UtcNow
        });
    }
}
