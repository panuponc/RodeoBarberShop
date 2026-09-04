using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Chairs;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChairsController(ApplicationDbContext dbContext) : ControllerBase
{
    [Authorize]
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ChairResponse>>> GetChairs(CancellationToken cancellationToken)
    {
        var chairs = await dbContext.Chairs
            .AsNoTracking()
            .OrderBy(chair => chair.SortOrder)
            .Select(chair => ToResponse(chair))
            .ToListAsync(cancellationToken);

        return Ok(chairs);
    }

    [Authorize]
    [HttpGet("schedule")]
    public async Task<ActionResult<IReadOnlyList<ChairScheduleResponse>>> GetSchedule(
        [FromQuery] DateOnly date,
        CancellationToken cancellationToken)
    {
        var chairs = await dbContext.Chairs
            .AsNoTracking()
            .Where(chair => chair.IsActive)
            .OrderBy(chair => chair.SortOrder)
            .Select(chair => new ChairScheduleResponse(
                chair.Id,
                chair.Name,
                chair.Note,
                chair.SortOrder,
                chair.IsActive,
                chair.Assignments
                    .Where(assignment => assignment.StartDate <= date
                        && (assignment.EndDate == null || assignment.EndDate >= date)
                        && assignment.Barber.User.AccountStatus == AccountStatus.Active)
                    .OrderByDescending(assignment => assignment.IsPrimary)
                    .ThenBy(assignment => assignment.Note == "ช่างหลัก" ? 0 : assignment.Note == "ช่างรอง" ? 1 : 2)
                    .ThenBy(assignment => assignment.Barber.User.FullName)
                    .Select(assignment => new ChairScheduleBarberResponse(
                        assignment.Id,
                        assignment.BarberId,
                        assignment.Barber.User.FullName,
                        assignment.Barber.User.Nickname,
                        assignment.Barber.User.Email,
                        assignment.IsPrimary,
                        assignment.Note,
                        assignment.StartDate,
                        assignment.EndDate))
                    .ToList()))
            .ToListAsync(cancellationToken);

        return Ok(chairs);
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPost]
    public async Task<ActionResult<ChairResponse>> CreateChair(
        CreateChairRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateChair(request.Name, request.SortOrder);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var now = DateTimeOffset.UtcNow;
        var chair = new Chair
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Note = NormalizeOptionalText(request.Note),
            SortOrder = request.SortOrder,
            IsActive = request.IsActive,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.Chairs.Add(chair);
        await dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetChairs), ToResponse(chair));
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ChairResponse>> UpdateChair(
        Guid id,
        UpdateChairRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateChair(request.Name, request.SortOrder);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var chair = await dbContext.Chairs.FirstOrDefaultAsync(chair => chair.Id == id, cancellationToken);
        if (chair is null)
        {
            return NotFound();
        }

        chair.Name = request.Name.Trim();
        chair.Note = NormalizeOptionalText(request.Note);
        chair.SortOrder = request.SortOrder;
        chair.IsActive = request.IsActive;
        chair.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(chair));
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpGet("assignments")]
    public async Task<ActionResult<IReadOnlyList<ChairAssignmentResponse>>> GetAssignments(CancellationToken cancellationToken)
    {
        var assignments = await dbContext.BarberChairAssignments
            .AsNoTracking()
            .Include(assignment => assignment.Chair)
            .Include(assignment => assignment.Barber)
            .ThenInclude(barber => barber.User)
            .OrderBy(assignment => assignment.Chair.SortOrder)
            .ThenByDescending(assignment => assignment.StartDate)
            .Select(assignment => ToResponse(assignment))
            .ToListAsync(cancellationToken);

        return Ok(assignments);
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPost("{chairId:guid}/assignments")]
    public async Task<ActionResult<ChairAssignmentResponse>> CreateAssignment(
        Guid chairId,
        CreateChairAssignmentRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = await ValidateAssignment(chairId, request.BarberId, request.StartDate, request.EndDate, cancellationToken);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var now = DateTimeOffset.UtcNow;
        var assignment = new BarberChairAssignment
        {
            Id = Guid.NewGuid(),
            ChairId = chairId,
            BarberId = request.BarberId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IsPrimary = request.IsPrimary,
            Note = NormalizeOptionalText(request.Note),
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.BarberChairAssignments.Add(assignment);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = await FindAssignmentResponse(assignment.Id, cancellationToken);
        return CreatedAtAction(nameof(GetAssignments), response);
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpPut("assignments/{assignmentId:guid}")]
    public async Task<ActionResult<ChairAssignmentResponse>> UpdateAssignment(
        Guid assignmentId,
        UpdateChairAssignmentRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = await ValidateAssignment(request.ChairId, request.BarberId, request.StartDate, request.EndDate, cancellationToken);
        if (validationError is not null)
        {
            return BadRequest(new { message = validationError });
        }

        var assignment = await dbContext.BarberChairAssignments
            .FirstOrDefaultAsync(assignment => assignment.Id == assignmentId, cancellationToken);

        if (assignment is null)
        {
            return NotFound();
        }

        assignment.ChairId = request.ChairId;
        assignment.BarberId = request.BarberId;
        assignment.StartDate = request.StartDate;
        assignment.EndDate = request.EndDate;
        assignment.IsPrimary = request.IsPrimary;
        assignment.Note = NormalizeOptionalText(request.Note);
        assignment.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(await FindAssignmentResponse(assignment.Id, cancellationToken));
    }

    [Authorize(Roles = "Owner,Admin")]
    [HttpDelete("assignments/{assignmentId:guid}")]
    public async Task<IActionResult> DeleteAssignment(Guid assignmentId, CancellationToken cancellationToken)
    {
        var assignment = await dbContext.BarberChairAssignments
            .FirstOrDefaultAsync(assignment => assignment.Id == assignmentId, cancellationToken);

        if (assignment is null)
        {
            return NotFound();
        }

        dbContext.BarberChairAssignments.Remove(assignment);
        await dbContext.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private static ChairResponse ToResponse(Chair chair)
    {
        return new ChairResponse(
            chair.Id,
            chair.Name,
            chair.Note,
            chair.SortOrder,
            chair.IsActive,
            chair.CreatedAt,
            chair.UpdatedAt);
    }

    private static ChairAssignmentResponse ToResponse(BarberChairAssignment assignment)
    {
        return new ChairAssignmentResponse(
            assignment.Id,
            assignment.ChairId,
            assignment.Chair.Name,
            assignment.BarberId,
            assignment.Barber.User.FullName,
            assignment.StartDate,
            assignment.EndDate,
            assignment.IsPrimary,
            assignment.Note,
            assignment.CreatedAt,
            assignment.UpdatedAt);
    }

    private async Task<ChairAssignmentResponse> FindAssignmentResponse(Guid assignmentId, CancellationToken cancellationToken)
    {
        return await dbContext.BarberChairAssignments
            .AsNoTracking()
            .Include(assignment => assignment.Chair)
            .Include(assignment => assignment.Barber)
            .ThenInclude(barber => barber.User)
            .Where(assignment => assignment.Id == assignmentId)
            .Select(assignment => ToResponse(assignment))
            .FirstAsync(cancellationToken);
    }

    private async Task<string?> ValidateAssignment(
        Guid chairId,
        Guid barberId,
        DateOnly startDate,
        DateOnly? endDate,
        CancellationToken cancellationToken)
    {
        if (endDate is not null && endDate < startDate)
        {
            return "End date must be on or after start date.";
        }

        var chairExists = await dbContext.Chairs.AnyAsync(chair => chair.Id == chairId, cancellationToken);
        if (!chairExists)
        {
            return "Chair does not exist.";
        }

        var barberExists = await dbContext.BarberProfiles.AnyAsync(barber => barber.Id == barberId, cancellationToken);
        if (!barberExists)
        {
            return "Barber does not exist.";
        }

        return null;
    }

    private static string? ValidateChair(string name, int sortOrder)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return "Chair name is required.";
        }

        if (sortOrder < 1)
        {
            return "Sort order must be greater than zero.";
        }

        return null;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
