using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Leaves;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Controllers;

[ApiController]
[Route("api/leaves")]
[Authorize(Roles = "Barber")]
public class LeavesController(ApplicationDbContext db) : ControllerBase
{
    private async Task<Guid?> CurrentBarber(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return null;
        return await db.BarberProfiles.Where(b => b.UserId == userId && b.User.AccountStatus == AccountStatus.Active)
            .Select(b => (Guid?)b.Id).FirstOrDefaultAsync(cancellationToken);
    }

    [HttpGet("my")]
    public async Task<ActionResult<IReadOnlyList<LeaveResponse>>> My(CancellationToken cancellationToken)
    {
        var barberId = await CurrentBarber(cancellationToken);
        if (barberId is null) return Forbid();
        var requests = await db.LeaveRequests.AsNoTracking().Where(l => l.BarberId == barberId)
            .OrderByDescending(l => l.CreatedAt).ToListAsync(cancellationToken);
        return Ok(requests.Select(ToResponse).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<LeaveResponse>> Create(CreateLeaveRequest request, CancellationToken cancellationToken)
    {
        var barberId = await CurrentBarber(cancellationToken);
        if (barberId is null) return Forbid();
        if (request.LeaveType is not ("Sick" or "Personal" or "Vacation" or "Other"))
            return BadRequest(new { message = "กรุณาเลือกประเภทการลา" });
        var reason = request.Reason?.Trim();
        if (string.IsNullOrEmpty(reason) || reason.Length > 1000)
            return BadRequest(new { message = "กรุณาระบุเหตุผลไม่เกิน 1,000 ตัวอักษร" });
        var now = DateTimeOffset.UtcNow;
        var today = new DateTimeOffset(now.ToOffset(TimeSpan.FromHours(7)).Date, TimeSpan.FromHours(7));
        if (request.StartAt < today || request.EndAt <= request.StartAt || request.EndAt - request.StartAt > TimeSpan.FromDays(366))
            return BadRequest(new { message = "วันลาเริ่มได้ตั้งแต่วันนี้ เวลาสิ้นสุดต้องหลังเวลาเริ่ม และช่วงลาไม่เกิน 366 วัน" });

        // Serialize overlap checks so rapid retries cannot create duplicate pending requests.
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(cancellationToken) : null;
        if (transaction is not null)
            await db.Database.ExecuteSqlRawAsync("LOCK TABLE leave_requests IN SHARE ROW EXCLUSIVE MODE", cancellationToken);
        if (await db.LeaveRequests.AnyAsync(l => l.BarberId == barberId && (l.Status == LeaveStatus.Pending || l.Status == LeaveStatus.Approved)
            && l.StartAt < request.EndAt && l.EndAt > request.StartAt, cancellationToken))
            return Conflict(new { message = "ช่วงเวลานี้มีคำขอรออนุมัติหรือได้รับอนุมัติแล้ว กรุณาตรวจรายการคำขอ" });
        var leave = new LeaveRequest { Id = Guid.NewGuid(), BarberId = barberId.Value, LeaveType = request.LeaveType, StartAt = request.StartAt.ToUniversalTime(), EndAt = request.EndAt.ToUniversalTime(), Reason = reason, Status = LeaveStatus.Pending, CreatedAt = now, UpdatedAt = now };
        db.LeaveRequests.Add(leave);
        await db.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ToResponse(leave));
    }

    private static LeaveResponse ToResponse(LeaveRequest leave) => new(leave.Id, leave.LeaveType, leave.StartAt, leave.EndAt, leave.Reason, leave.Status.ToString(), leave.ReviewNote, leave.ReviewedAt, leave.CreatedAt);
}
