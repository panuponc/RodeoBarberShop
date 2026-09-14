using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Leaves;
using RodeoBarberShop.Api.Controllers;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;
using Xunit;

namespace RodeoBarberShop.Api.Tests;

public class BarberLeaveTests
{
    private sealed class FixedClock(DateTimeOffset now) : TimeProvider { public override DateTimeOffset GetUtcNow() => now.ToUniversalTime(); }

    [Theory]
    [InlineData(20, 59, true)]
    [InlineData(21, 0, false)]
    [InlineData(23, 30, false)]
    public async Task FullDayLeaveUsesWorkingHoursNotMidnight(int hour, int minute, bool allowed)
    {
        using var f = new Fixture();
        var today = new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.FromHours(7));
        var controller = f.Controller(clock: new FixedClock(today.AddHours(hour).AddMinutes(minute)));
        var request = new CreateLeaveRequest("Personal", today, today.AddDays(1), "Full day");
        var result = (await controller.Create(request, default)).Result;
        if (allowed) Assert.Equal(201, Assert.IsType<ObjectResult>(result).StatusCode);
        else { Assert.IsType<BadRequestObjectResult>(result); Assert.Empty(f.Db.LeaveRequests); }
    }

    [Fact]
    public async Task ShopClosingEarlierAndElapsedPartialPeriodAreRejectedButTomorrowIsAllowed()
    {
        using var f = new Fixture();
        var today = new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.FromHours(7));
        f.Db.ShopSettings.Add(new() { Id = Guid.NewGuid(), OpeningTime = new(10, 0), ClosingTime = new(18, 0) });
        await f.Db.SaveChangesAsync();
        var controller = f.Controller(clock: new FixedClock(today.AddHours(18)));
        var request = new CreateLeaveRequest("Personal", today, today.AddDays(1), "Test");
        Assert.IsType<BadRequestObjectResult>((await controller.Create(request, default)).Result);
        Assert.IsType<BadRequestObjectResult>((await controller.Create(request with { EndAt = today.AddDays(2) }, default)).Result);
        Assert.IsType<BadRequestObjectResult>((await controller.Create(request with { StartAt = today.AddHours(16), EndAt = today.AddHours(17) }, default)).Result);
        Assert.Equal(201, Assert.IsType<ObjectResult>((await controller.Create(request with { StartAt = today.AddDays(1), EndAt = today.AddDays(2) }, default)).Result).StatusCode);
    }

    [Fact]
    public async Task OwnerCannotApproveFullDayAfterWorkEnds()
    {
        using var f = new Fixture();
        var today = new DateTimeOffset(2026, 10, 1, 0, 0, 0, TimeSpan.FromHours(7));
        await f.Controller(clock: new FixedClock(today.AddHours(12))).Create(new("Personal", today, today.AddDays(1), "Test"), default);
        var owner = new User { Id = Guid.NewGuid(), Role = UserRole.Owner, AccountStatus = AccountStatus.Active };
        f.Db.Users.Add(owner); await f.Db.SaveChangesAsync();
        var controller = new LeavesController(f.Db, new FixedClock(today.AddHours(21))) { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, owner.Id.ToString()), new Claim(ClaimTypes.Role, "Owner")], "Test")) } } };
        Assert.IsType<ConflictObjectResult>((await controller.Approve(f.Db.LeaveRequests.Single().Id, new(null, []), default)).Result);
        Assert.Equal(LeaveStatus.Pending, f.Db.LeaveRequests.Single().Status);
    }

    [Fact]
    public async Task ThaiOffsetRequestStoresUtcAndDetectsSamePeriodSentAsUtc()
    {
        using var f = new Fixture();
        var start = f.Request().StartAt.ToOffset(TimeSpan.FromHours(7));
        var request = new CreateLeaveRequest("Personal", start, start.AddHours(2), "Thai time request");
        Assert.Equal(201, Assert.IsType<ObjectResult>((await f.Controller().Create(request, default)).Result).StatusCode);
        var stored = Assert.Single(f.Db.LeaveRequests);
        Assert.Equal(TimeSpan.Zero, stored.StartAt.Offset);
        Assert.Equal(TimeSpan.Zero, stored.EndAt.Offset);
        Assert.Equal(start.ToUniversalTime(), stored.StartAt);
        Assert.IsType<ConflictObjectResult>((await f.Controller().Create(request with { StartAt = start.ToUniversalTime(), EndAt = start.AddHours(2).ToUniversalTime() }, default)).Result);
        Assert.Single(f.Db.LeaveRequests);
    }

    [Fact]
    public async Task SubmitPendingAndOnlyReadOwnRequests()
    {
        using var f = new Fixture();
        var result = Assert.IsType<ObjectResult>((await f.Controller().Create(f.Request(), default)).Result);
        Assert.Equal(201, result.StatusCode);
        var leave = Assert.IsType<LeaveResponse>(result.Value);
        Assert.Equal("Pending", leave.Status);
        Assert.Null(leave.ReviewedAt);
        Assert.Equal(f.Barber.Id, Assert.Single(f.Db.LeaveRequests).BarberId);
        var own = Assert.IsType<OkObjectResult>((await f.Controller().My(default)).Result);
        Assert.Single(Assert.IsAssignableFrom<IReadOnlyList<LeaveResponse>>(own.Value));
        var other = new BarberProfile { Id = Guid.NewGuid(), User = new User { Id = Guid.NewGuid(), Role = UserRole.Barber, AccountStatus = AccountStatus.Active } };
        other.UserId = other.User.Id;
        f.Db.BarberProfiles.Add(other); await f.Db.SaveChangesAsync();
        var otherResult = Assert.IsType<OkObjectResult>((await f.Controller(other.UserId).My(default)).Result);
        Assert.Empty(Assert.IsAssignableFrom<IReadOnlyList<LeaveResponse>>(otherResult.Value));
        Assert.Empty(f.Db.QueueEvents);
    }

    [Theory]
    [InlineData(LeaveStatus.Pending, true)]
    [InlineData(LeaveStatus.Approved, true)]
    [InlineData(LeaveStatus.Rejected, false)]
    [InlineData(LeaveStatus.Cancelled, false)]
    public async Task BlocksOnlyActiveOverlaps(LeaveStatus status, bool blocked)
    {
        using var f = new Fixture();
        var request = f.Request();
        await f.Controller().Create(request, default);
        f.Db.LeaveRequests.Single().Status = status; await f.Db.SaveChangesAsync();
        var result = (await f.Controller().Create(request, default)).Result;
        if (blocked) Assert.IsType<ConflictObjectResult>(result);
        else Assert.Equal(201, Assert.IsType<ObjectResult>(result).StatusCode);
        Assert.Equal(blocked ? 1 : 2, f.Db.LeaveRequests.Count());
    }

    [Fact]
    public async Task AllowsAdjacentPeriodAndRejectsBadInput()
    {
        using var f = new Fixture();
        var r = f.Request();
        Assert.IsType<BadRequestObjectResult>((await f.Controller().Create(r with { EndAt = r.StartAt }, default)).Result);
        Assert.IsType<BadRequestObjectResult>((await f.Controller().Create(r with { StartAt = DateTimeOffset.UtcNow.AddDays(-2) }, default)).Result);
        Assert.IsType<BadRequestObjectResult>((await f.Controller().Create(r with { LeaveType = "Unknown" }, default)).Result);
        Assert.IsType<BadRequestObjectResult>((await f.Controller().Create(r with { Reason = " " }, default)).Result);
        Assert.IsType<BadRequestObjectResult>((await f.Controller().Create(r with { Reason = new string('x', 1001) }, default)).Result);
        await f.Controller().Create(r, default);
        Assert.Equal(201, Assert.IsType<ObjectResult>((await f.Controller().Create(r with { StartAt = r.EndAt, EndAt = r.EndAt.AddHours(1) }, default)).Result).StatusCode);
    }

    [Fact]
    public async Task RequiresActiveBarber()
    {
        using var f = new Fixture();
        Assert.IsType<ForbidResult>((await f.Controller(Guid.NewGuid()).My(default)).Result);
        f.Barber.User.AccountStatus = AccountStatus.Disabled; await f.Db.SaveChangesAsync();
        Assert.IsType<ForbidResult>((await f.Controller().Create(f.Request(), default)).Result);
    }

    private sealed class Fixture : IDisposable
    {
        public ApplicationDbContext Db { get; } = new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public BarberProfile Barber { get; } = new() { Id = Guid.NewGuid(), User = new User { Id = Guid.NewGuid(), FullName = "Test", AccountStatus = AccountStatus.Active, Role = UserRole.Barber } };
        public Fixture() {
            Barber.UserId = Barber.User.Id; Db.BarberProfiles.Add(Barber);
            for (var day = 0; day < 7; day++) Db.BarberWorkingHours.Add(new() { Id = Guid.NewGuid(), BarberId = Barber.Id, DayOfWeek = day, IsWorkingDay = true, StartTime = new(10, 0), EndTime = new(21, 0) });
            Db.SaveChanges();
        }
        public CreateLeaveRequest Request() { var start = new DateTimeOffset(DateTime.SpecifyKind(DateTime.UtcNow.AddDays(2).Date.AddHours(12), DateTimeKind.Unspecified), TimeSpan.FromHours(7)); return new("Personal", start, start.AddHours(2), "Test reason"); }
        public LeavesController Controller(Guid? user = null, TimeProvider? clock = null) => new(Db, clock) { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, (user ?? Barber.UserId).ToString()), new Claim(ClaimTypes.Role, "Barber")], "Test")) } } };
        public void Dispose() => Db.Dispose();
    }
}
