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
        public Fixture() { Barber.UserId = Barber.User.Id; Db.BarberProfiles.Add(Barber); Db.SaveChanges(); }
        public CreateLeaveRequest Request() { var start = DateTimeOffset.UtcNow.AddDays(2); return new("Personal", start, start.AddHours(2), "Test reason"); }
        public LeavesController Controller(Guid? user = null) => new(Db) { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, (user ?? Barber.UserId).ToString()), new Claim(ClaimTypes.Role, "Barber")], "Test")) } } };
        public void Dispose() => Db.Dispose();
    }
}
