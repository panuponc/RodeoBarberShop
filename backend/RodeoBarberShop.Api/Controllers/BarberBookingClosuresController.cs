using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;

namespace RodeoBarberShop.Api.Controllers;

public record CloseBarberBookingsRequest(string Reason, DateOnly? Date = null);

[ApiController]
[Route("api/barbers/{barberId:guid}/booking-closures")]
[Authorize(Roles = "Owner,Admin,FrontDeskStaff")]
public class BarberBookingClosuresController(ApplicationDbContext db, TimeProvider? clock = null) : ControllerBase
{
    private DateTimeOffset Now => (clock ?? TimeProvider.System).GetUtcNow();
    private async Task<(DateTimeOffset Start, DateTimeOffset End)?> WorkingWindow(Guid barberId, DateOnly day, DateTimeOffset now, CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(now.ToOffset(TimeSpan.FromHours(7)).Date);
        if (day < today || day > today.AddDays(366)) return null;
        if (await db.ShopHolidays.AnyAsync(h => (h.HolidayType == HolidayType.Weekly && h.DayOfWeek == (int)day.DayOfWeek)
            || (h.HolidayType == HolidayType.Special && h.HolidayDate == day), ct)) return null;
        var hours = await db.BarberWorkingHours.AsNoTracking().FirstOrDefaultAsync(h => h.BarberId == barberId && h.DayOfWeek == (int)day.DayOfWeek
            && h.IsWorkingDay && h.Barber.IsAvailable && h.Barber.AcceptsBooking && h.Barber.User.AccountStatus == AccountStatus.Active, ct);
        if (hours is null) return null;
        var shop = await db.ShopSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        var opening = shop is not null && shop.OpeningTime > hours.StartTime ? shop.OpeningTime : hours.StartTime;
        var closing = shop is not null && shop.ClosingTime < hours.EndTime ? shop.ClosingTime : hours.EndTime;
        var start = new DateTimeOffset(day.ToDateTime(opening), TimeSpan.FromHours(7)).ToUniversalTime();
        var end = new DateTimeOffset(day.ToDateTime(closing), TimeSpan.FromHours(7)).ToUniversalTime();
        if (end <= start || (day == today && (now < start || now >= end))) return null;
        return (day == today ? now : start, end);
    }
    private async Task<Guid?> Staff(CancellationToken ct)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)
            || !(User.IsInRole("Owner") || User.IsInRole("Admin") || User.IsInRole("FrontDeskStaff"))) return null;
        return await db.Users.Where(u => u.Id == id && u.AccountStatus == AccountStatus.Active && (u.Role == UserRole.Owner || u.Role == UserRole.Admin || u.Role == UserRole.FrontDeskStaff)).Select(u => (Guid?)u.Id).FirstOrDefaultAsync(ct);
    }

    [HttpPost]
    public async Task<IActionResult> Close(Guid barberId, CloseBarberBookingsRequest request, CancellationToken ct)
    {
        var staff = await Staff(ct); if (staff is null) return Forbid();
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length > 1000)
            return BadRequest(new { message = "กรุณาระบุเหตุผลไม่เกิน 1,000 ตัวอักษร" });
        await using var transaction = await BookingWriteLock.BeginAsync(db, ct);
        var now = Now;
        var day = request.Date ?? DateOnly.FromDateTime(now.ToOffset(TimeSpan.FromHours(7)).Date);
        var window = await WorkingWindow(barberId, day, now, ct);
        if (window is null) return BadRequest(new { message = "วันที่เลือกเป็นวันหยุด ย้อนหลัง หรือไม่มีเวลางานที่จัดการได้" });
        var start = window.Value.Start; var end = window.Value.End;
        var isToday = day == DateOnly.FromDateTime(now.ToOffset(TimeSpan.FromHours(7)).Date);
        if (await db.LeaveRequests.AnyAsync(l => l.BarberId == barberId && (l.Status == LeaveStatus.Approved || l.Status == LeaveStatus.CancellationPending) && l.StartAt <= start && (isToday ? l.EndAt > start : l.EndAt >= end), ct))
            return Conflict(new { message = "ช่างอยู่ในช่วงลาที่ปิดรับจองแล้ว" });
        if (await db.BarberBookingClosures.AnyAsync(c => c.BarberId == barberId && c.ReopenedAt == null && c.StartAt < end && c.EndAt > start, ct))
            return Conflict(new { message = "ช่างถูกปิดรับจองแล้ว กรุณารีเฟรชตาราง" });
        var closure = new BarberBookingClosure { Id = Guid.NewGuid(), BarberId = barberId, StartAt = start, EndAt = end, Reason = request.Reason.Trim(), ClosedByUserId = staff.Value };
        db.BarberBookingClosures.Add(closure); await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return StatusCode(201, new { closure.Id, closure.BarberId, closure.StartAt, closure.EndAt });
    }

    [HttpPost("{id:guid}/reopen")]
    public async Task<IActionResult> Reopen(Guid barberId, Guid id, CancellationToken ct)
    {
        var staff = await Staff(ct); if (staff is null) return Forbid();
        await using var transaction = await BookingWriteLock.BeginAsync(db, ct);
        var closure = await db.BarberBookingClosures.FirstOrDefaultAsync(c => c.Id == id && c.BarberId == barberId, ct);
        if (closure is null) return NotFound();
        var day = DateOnly.FromDateTime(closure.StartAt.ToOffset(TimeSpan.FromHours(7)).Date);
        if (await WorkingWindow(barberId, day, Now, ct) is null)
            return BadRequest(new { message = "วันที่เลือกเป็นวันหยุดหรืออยู่นอกเวลาที่จัดการได้" });
        if (closure.ReopenedAt != null || closure.EndAt <= Now) return Conflict(new { message = "รายการปิดรับจองนี้สิ้นสุดแล้ว กรุณารีเฟรชตาราง" });
        closure.ReopenedAt = Now; closure.ReopenedByUserId = staff.Value;
        await db.SaveChangesAsync(ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return Ok(new { message = "เปิดรับจองกลับแล้ว โดยยังตรวจตารางงานและวันลาตามปกติ" });
    }
}
