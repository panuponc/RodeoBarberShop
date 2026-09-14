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
[Authorize(Roles = "Barber,Owner,Admin")]
public class LeavesController(ApplicationDbContext db) : ControllerBase
{
    private async Task<Guid?> CurrentBarber(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)) return null;
        return await db.BarberProfiles.Where(b => b.UserId == userId && b.User.AccountStatus == AccountStatus.Active)
            .Select(b => (Guid?)b.Id).FirstOrDefaultAsync(cancellationToken);
    }

    [HttpGet("my")]
    [Authorize(Roles = "Barber")]
    public async Task<ActionResult<IReadOnlyList<LeaveResponse>>> My(CancellationToken cancellationToken)
    {
        var barberId = await CurrentBarber(cancellationToken);
        if (barberId is null) return Forbid();
        var requests = await db.LeaveRequests.AsNoTracking().Where(l => l.BarberId == barberId)
            .OrderByDescending(l => l.CreatedAt).ToListAsync(cancellationToken);
        return Ok(requests.Select(ToResponse).ToList());
    }

    [HttpPost]
    [Authorize(Roles = "Barber")]
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

        // PostgreSQL timestamptz parameters must be UTC, including query predicates.
        var startAtUtc = request.StartAt.ToUniversalTime();
        var endAtUtc = request.EndAt.ToUniversalTime();
        // Serialize overlap checks so rapid retries cannot create duplicate pending requests.
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(cancellationToken) : null;
        if (transaction is not null)
            await db.Database.ExecuteSqlRawAsync("LOCK TABLE leave_requests IN SHARE ROW EXCLUSIVE MODE", cancellationToken);
        if (await db.LeaveRequests.AnyAsync(l => l.BarberId == barberId && (l.Status == LeaveStatus.Pending || l.Status == LeaveStatus.Approved)
            && l.StartAt < endAtUtc && l.EndAt > startAtUtc, cancellationToken))
            return Conflict(new { message = "ช่วงเวลานี้มีคำขอรออนุมัติหรือได้รับอนุมัติแล้ว กรุณาตรวจรายการคำขอ" });
        var leave = new LeaveRequest { Id = Guid.NewGuid(), BarberId = barberId.Value, LeaveType = request.LeaveType, StartAt = startAtUtc, EndAt = endAtUtc, Reason = reason, Status = LeaveStatus.Pending, CreatedAt = now, UpdatedAt = now };
        db.LeaveRequests.Add(leave);
        await db.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, ToResponse(leave));
    }

    [HttpGet]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<IReadOnlyList<ManagedLeaveResponse>>> List(CancellationToken cancellationToken)
    {
        if (await Reviewer(cancellationToken) is null) return Forbid();
        var leaves = await db.LeaveRequests.AsNoTracking().Include(l => l.Barber).ThenInclude(b => b.User)
            .Include(l => l.ReviewedByUser).OrderByDescending(l => l.CreatedAt).ToListAsync(cancellationToken);
        var result = new List<ManagedLeaveResponse>();
        foreach (var leave in leaves)
            result.Add(new(ToResponse(leave), leave.BarberId, leave.Barber.User.FullName, leave.ReviewedByUser?.FullName, await AffectedQuery(leave).CountAsync(cancellationToken)));
        return Ok(result);
    }

    [HttpGet("{id:guid}/affected-bookings")]
    [Authorize(Roles = "Owner,Admin")]
    public async Task<ActionResult<IReadOnlyList<AffectedLeaveBooking>>> Affected(Guid id, CancellationToken cancellationToken)
    {
        if (await Reviewer(cancellationToken) is null) return Forbid();
        var leave = await db.LeaveRequests.AsNoTracking().FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
        if (leave is null) return NotFound();
        return Ok(await AffectedQuery(leave).OrderBy(b => b.StartAt)
            .Select(b => new AffectedLeaveBooking(b.Id, b.BookingNumber, b.Customer != null ? b.Customer.FullName : b.GuestName, b.StartAt, b.EndAt, b.BookingStatus.ToString())).ToListAsync(cancellationToken));
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = "Owner,Admin")]
    public Task<ActionResult<LeaveResponse>> Approve(Guid id, ReviewLeaveRequest request, CancellationToken cancellationToken) => Review(id, request, true, cancellationToken);

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = "Owner,Admin")]
    public Task<ActionResult<LeaveResponse>> Reject(Guid id, ReviewLeaveRequest request, CancellationToken cancellationToken) => Review(id, request, false, cancellationToken);

    private async Task<ActionResult<LeaveResponse>> Review(Guid id, ReviewLeaveRequest request, bool approve, CancellationToken cancellationToken)
    {
        var reviewer = await Reviewer(cancellationToken);
        if (reviewer is null) return Forbid();
        var note = request.Note?.Trim();
        if ((!approve && string.IsNullOrEmpty(note)) || note?.Length > 1000)
            return BadRequest(new { message = "กรุณาระบุเหตุผลที่ไม่อนุมัติ และหมายเหตุต้องไม่เกิน 1,000 ตัวอักษร" });
        // Use the booking writer lock first so approval and new bookings cannot pass each other's validation.
        await using var transaction = await BookingWriteLock.BeginAsync(db, cancellationToken);
        if (transaction is not null)
            await db.Database.ExecuteSqlRawAsync("LOCK TABLE leave_requests IN SHARE ROW EXCLUSIVE MODE", cancellationToken);
        var leave = await db.LeaveRequests.FirstOrDefaultAsync(l => l.Id == id, cancellationToken);
        if (leave is null) return NotFound();
        if (leave.Status != LeaveStatus.Pending)
            return Conflict(new { message = "คำขอนี้ได้รับการพิจารณาแล้ว กรุณาโหลดข้อมูลล่าสุด" });
        if (approve)
        {
            if (leave.EndAt <= DateTimeOffset.UtcNow)
                return Conflict(new { message = "ช่วงลานี้สิ้นสุดแล้ว ไม่สามารถอนุมัติได้" });
            var affectedIds = await AffectedQuery(leave).Select(b => b.Id).ToListAsync(cancellationToken);
            if (request.AffectedBookingIds is null || !affectedIds.ToHashSet().SetEquals(request.AffectedBookingIds))
                return Conflict(new { message = "รายการคิวที่กระทบเปลี่ยนแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนอนุมัติ" });
            if (await db.LeaveRequests.AnyAsync(l => l.Id != id && l.BarberId == leave.BarberId && l.Status == LeaveStatus.Approved && l.StartAt < leave.EndAt && l.EndAt > leave.StartAt, cancellationToken))
                return Conflict(new { message = "มีวันลาที่อนุมัติแล้วทับช่วงเวลานี้" });
        }
        leave.Status = approve ? LeaveStatus.Approved : LeaveStatus.Rejected;
        leave.ReviewNote = string.IsNullOrEmpty(note) ? null : note;
        leave.ReviewedByUserId = reviewer;
        leave.ReviewedAt = leave.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        if (transaction is not null) await transaction.CommitAsync(cancellationToken);
        return Ok(ToResponse(leave));
    }

    private IQueryable<Booking> AffectedQuery(LeaveRequest leave) => db.Bookings.AsNoTracking().Where(b => b.BarberId == leave.BarberId
        && b.StartAt < leave.EndAt && b.EndAt > leave.StartAt
        && b.BookingStatus != BookingStatus.Cancelled && b.BookingStatus != BookingStatus.NoShow && b.BookingStatus != BookingStatus.Completed);

    private async Task<Guid?> Reviewer(CancellationToken cancellationToken)
    {
        if ((!User.IsInRole("Owner") && !User.IsInRole("Admin")) || !Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) return null;
        return await db.Users.Where(u => u.Id == id && u.AccountStatus == AccountStatus.Active && (u.Role == UserRole.Owner || u.Role == UserRole.Admin))
            .Select(u => (Guid?)u.Id).FirstOrDefaultAsync(cancellationToken);
    }

    private static LeaveResponse ToResponse(LeaveRequest leave) => new(leave.Id, leave.LeaveType, leave.StartAt, leave.EndAt, leave.Reason, leave.Status.ToString(), leave.ReviewNote, leave.ReviewedAt, leave.CreatedAt);
}
