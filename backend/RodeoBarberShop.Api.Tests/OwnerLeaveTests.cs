using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Leaves;
using RodeoBarberShop.Api.Contracts.Bookings;
using RodeoBarberShop.Api.Controllers;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;
using Xunit;

namespace RodeoBarberShop.Api.Tests;

public class OwnerLeaveTests
{
    [Theory]
    [InlineData(UserRole.Owner)]
    [InlineData(UserRole.Admin)]
    public async Task ApprovalRecordsReviewerAndPreservesAffectedBooking(UserRole role)
    {
        using var f = new Fixture();
        f.Owner.Role = role; await f.Db.SaveChangesAsync();
        var booking = f.AddBooking(); await f.Db.SaveChangesAsync();
        var controller = f.Controller(role);
        var affected = Assert.IsAssignableFrom<IReadOnlyList<AffectedLeaveBooking>>(Assert.IsType<OkObjectResult>((await controller.Affected(f.Leave.Id, default)).Result).Value);
        Assert.Equal(booking.Id, Assert.Single(affected).Id);
        Assert.IsType<ConflictObjectResult>((await controller.Approve(f.Leave.Id, new(null, []), default)).Result);
        Assert.IsType<OkObjectResult>((await controller.Approve(f.Leave.Id, new("Reviewed", [booking.Id]), default)).Result);
        Assert.Equal(LeaveStatus.Approved, f.Leave.Status);
        Assert.Equal(f.Owner.Id, f.Leave.ReviewedByUserId);
        Assert.NotNull(f.Leave.ReviewedAt);
        Assert.Equal(BookingStatus.Confirmed, booking.BookingStatus);
        Assert.Empty(f.Db.QueueEvents);
        Assert.IsType<ConflictObjectResult>((await controller.Reject(f.Leave.Id, new("Changed mind", []), default)).Result);
        var list = Assert.IsAssignableFrom<IReadOnlyList<ManagedLeaveResponse>>(Assert.IsType<OkObjectResult>((await controller.List(default)).Result).Value);
        Assert.Equal(1, Assert.Single(list).AffectedBookingCount);
        Assert.Equal("Manager", list[0].ReviewerName);
    }

    [Theory]
    [InlineData(UserRole.Barber)]
    [InlineData(UserRole.Customer)]
    [InlineData(UserRole.FrontDeskStaff)]
    public async Task OtherRolesCannotReviewOrReadManagementLists(UserRole role)
    {
        using var f = new Fixture();
        var controller = f.Controller(role);
        Assert.IsType<ForbidResult>((await controller.List(default)).Result);
        Assert.IsType<ForbidResult>((await controller.Affected(f.Leave.Id, default)).Result);
        Assert.IsType<ForbidResult>((await controller.Approve(f.Leave.Id, new(null, []), default)).Result);
        Assert.Equal(LeaveStatus.Pending, f.Leave.Status);
    }

    [Fact]
    public async Task RejectionNeedsReasonAndDoesNotBlockSlots()
    {
        using var f = new Fixture();
        Assert.IsType<BadRequestObjectResult>((await f.Controller().Reject(f.Leave.Id, new(" ", []), default)).Result);
        Assert.IsType<OkObjectResult>((await f.Controller().Reject(f.Leave.Id, new("Please choose another date", []), default)).Result);
        Assert.Equal(LeaveStatus.Rejected, f.Leave.Status);
        Assert.All(await f.Slots(), slot => Assert.True(slot.IsAvailable));
    }

    [Fact]
    public async Task ApprovedLeaveBlocksOnlyOverlappingSlotsAndBothBookingPaths()
    {
        using var f = new Fixture();
        Assert.All(await f.Slots(), slot => Assert.True(slot.IsAvailable));
        await f.Controller().Approve(f.Leave.Id, new(null, []), default);
        var slots = await f.Slots();
        Assert.False(slots.Single(s => s.StartAt == f.Start).IsAvailable);
        Assert.True(slots.Single(s => s.StartAt == f.Start.AddHours(-1)).IsAvailable);
        Assert.True(slots.Single(s => s.StartAt == f.Start.AddHours(1)).IsAvailable);
        var bookings = new BookingsController(f.Db) { ControllerContext = f.Controller().ControllerContext };
        Assert.IsType<BadRequestObjectResult>((await bookings.CreateBooking(new(f.Barber.Id, f.Start, [f.Service.Id], null), default)).Result);
        Assert.IsType<BadRequestObjectResult>((await bookings.CreateStaffBooking(new(null, "Walk-in", "0812345678", null, f.Barber.Id, f.Start, [f.Service.Id], null), default)).Result);
        Assert.Empty(f.Db.Bookings);
    }

    [Fact]
    public async Task IgnoresClosedAndAdjacentBookingsAndRejectsExpiredApproval()
    {
        using var f = new Fixture();
        var closed = f.AddBooking(); closed.BookingStatus = BookingStatus.Cancelled;
        var adjacent = f.AddBooking(); adjacent.StartAt = f.Leave.EndAt; adjacent.EndAt = adjacent.StartAt.AddHours(1);
        await f.Db.SaveChangesAsync();
        var affected = Assert.IsAssignableFrom<IReadOnlyList<AffectedLeaveBooking>>(Assert.IsType<OkObjectResult>((await f.Controller().Affected(f.Leave.Id, default)).Result).Value);
        Assert.Empty(affected);
        f.Leave.StartAt = DateTimeOffset.UtcNow.AddDays(-2); f.Leave.EndAt = DateTimeOffset.UtcNow.AddDays(-1); await f.Db.SaveChangesAsync();
        Assert.IsType<ConflictObjectResult>((await f.Controller().Approve(f.Leave.Id, new(null, []), default)).Result);
    }

    [Fact]
    public async Task FullDayLeaveBlocksAllSlotsAndDisabledOwnerCannotReview()
    {
        using var f = new Fixture();
        f.Leave.StartAt = f.Start.AddHours(-11).ToUniversalTime();
        f.Leave.EndAt = f.Leave.StartAt.AddDays(1);
        await f.Db.SaveChangesAsync();
        f.Owner.AccountStatus = AccountStatus.Disabled; await f.Db.SaveChangesAsync();
        Assert.IsType<ForbidResult>((await f.Controller().Approve(f.Leave.Id, new(null, []), default)).Result);
        f.Owner.AccountStatus = AccountStatus.Active; await f.Db.SaveChangesAsync();
        Assert.IsType<OkObjectResult>((await f.Controller().Approve(f.Leave.Id, new(null, []), default)).Result);
        Assert.All(await f.Slots(), slot => Assert.False(slot.IsAvailable));
    }

    [Fact]
    public async Task ServiceExtensionCannotCrossIntoApprovedLeave()
    {
        using var f = new Fixture();
        await f.Controller().Approve(f.Leave.Id, new(null, []), default);
        var booking = f.AddBooking();
        booking.StartAt = f.Start.AddHours(-1); booking.EndAt = f.Start;
        booking.BookingStatus = BookingStatus.InService; booking.PaymentStatus = PaymentStatus.Unpaid;
        await f.Db.SaveChangesAsync();
        var controller = new QueueController(f.Db) { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, f.Barber.UserId.ToString()), new Claim(ClaimTypes.Role, "Barber")], "Test")) } } };
        Assert.IsType<ConflictObjectResult>((await controller.AddServices(booking.Id, new([f.Service.Id], booking.EndAt, booking.TotalAmount, f.Service.Price, f.Service.DurationMinutes), default)).Result);
        Assert.Empty(booking.BookingServices);
    }

    private sealed class Fixture : IDisposable
    {
        public ApplicationDbContext Db { get; } = new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public User Owner { get; } = new() { Id = Guid.NewGuid(), FullName = "Manager", Role = UserRole.Owner, AccountStatus = AccountStatus.Active };
        public BarberProfile Barber { get; } = new() { Id = Guid.NewGuid(), User = new User { Id = Guid.NewGuid(), FullName = "Barber", Role = UserRole.Barber, AccountStatus = AccountStatus.Active }, IsAvailable = true, AcceptsBooking = true };
        public Service Service { get; } = new() { Id = Guid.NewGuid(), Name = "Haircut", Price = 100, DurationMinutes = 60, IsActive = true };
        public LeaveRequest Leave { get; }
        public DateTimeOffset Start { get; } = new(DateTime.SpecifyKind(DateTime.UtcNow.AddDays(5).Date.AddHours(11), DateTimeKind.Unspecified), TimeSpan.FromHours(7));
        public Fixture()
        {
            Barber.UserId = Barber.User.Id;
            Leave = new() { Id = Guid.NewGuid(), Barber = Barber, BarberId = Barber.Id, StartAt = Start.ToUniversalTime(), EndAt = Start.AddHours(1).ToUniversalTime(), Status = LeaveStatus.Pending, Reason = "Test", LeaveType = "Personal" };
            Db.Users.Add(Owner); Db.Services.Add(Service); Db.LeaveRequests.Add(Leave);
            Db.BarberWorkingHours.Add(new() { Id = Guid.NewGuid(), BarberId = Barber.Id, DayOfWeek = (int)Start.DayOfWeek, IsWorkingDay = true, StartTime = new(10,0), EndTime = new(15,0) });
            Db.SaveChanges();
        }
        public Booking AddBooking() { var booking = new Booking { Id = Guid.NewGuid(), BarberId = Barber.Id, StartAt = Start, EndAt = Start.AddHours(1), BookingStatus = BookingStatus.Confirmed, GuestName = "Customer" }; Db.Bookings.Add(booking); return booking; }
        public LeavesController Controller(UserRole role = UserRole.Owner) => new(Db) { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, Owner.Id.ToString()), new Claim(ClaimTypes.Role, role.ToString())], "Test")) } } };
        public async Task<IReadOnlyList<AvailabilitySlotResponse>> Slots() => Assert.IsAssignableFrom<IReadOnlyList<AvailabilitySlotResponse>>(Assert.IsType<OkObjectResult>((await new BookingsController(Db).GetAvailability(Barber.Id, DateOnly.FromDateTime(Start.Date), [Service.Id], default)).Result).Value);
        public void Dispose() => Db.Dispose();
    }
}
