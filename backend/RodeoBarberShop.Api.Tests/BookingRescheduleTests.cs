using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Bookings;
using RodeoBarberShop.Api.Controllers;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;
using Xunit;

namespace RodeoBarberShop.Api.Tests;

public class BookingRescheduleTests
{
    private sealed class Fixture : IDisposable
    {
        public ApplicationDbContext Db { get; } = new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public User Staff { get; } = new() { Id = Guid.NewGuid(), Role = UserRole.Owner, AccountStatus = AccountStatus.Active };
        public BarberProfile First { get; } = new() { Id = Guid.NewGuid(), User = new() { Id = Guid.NewGuid(), AccountStatus = AccountStatus.Active } };
        public BarberProfile Second { get; } = new() { Id = Guid.NewGuid(), User = new() { Id = Guid.NewGuid(), AccountStatus = AccountStatus.Active } };
        public Booking Booking { get; }
        public BookingsController Controller { get; }
        public Fixture(UserRole role = UserRole.Owner)
        {
            Staff.Role = role;
            var day = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3));
            var start = new DateTimeOffset(day.ToDateTime(new TimeOnly(10, 0)), TimeSpan.FromHours(7)).ToUniversalTime();
            var service = new Service { Id = Guid.NewGuid(), Name = "Cut", DurationMinutes = 120, Price = 900, IsActive = true };
            Booking = new() { Id = Guid.NewGuid(), BookingNumber = "KEEP-1", BarberId = First.Id, StartAt = start, EndAt = start.AddHours(1),
                EstimatedDurationMinutes = 60, TotalAmount = 350, SubtotalAmount = 350, BookingStatus = BookingStatus.Confirmed,
                PaymentStatus = PaymentStatus.Unpaid, UpdatedAt = DateTimeOffset.UtcNow.AddDays(-1), CheckedInAt = DateTimeOffset.UtcNow,
                BookingServices = [new() { Id = Guid.NewGuid(), ServiceId = service.Id, ServiceName = "Cut", DurationMinutes = 60, Quantity = 1, UnitPrice = 350, LineTotal = 350 }] };
            Db.Users.Add(Staff); Db.BarberProfiles.AddRange(First, Second); Db.Services.Add(service); Db.Bookings.Add(Booking);
            foreach (var barber in new[] { First, Second })
                for (var d = 0; d < 7; d++) Db.BarberWorkingHours.Add(new() { Id = Guid.NewGuid(), BarberId = barber.Id, DayOfWeek = d, IsWorkingDay = true, StartTime = new(10, 0), EndTime = new(21, 0) });
            Db.SaveChanges();
            Controller = new(Db) { ControllerContext = new() { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([
                new Claim(ClaimTypes.NameIdentifier, Staff.Id.ToString()), new Claim(ClaimTypes.Role, role.ToString())], "Test")) } } };
        }
        public RescheduleBookingRequest Request(Guid? barber = null, DateTimeOffset? start = null) => new(barber ?? Second.Id, start ?? Booking.StartAt, Booking.UpdatedAt, "Customer agreed");
        public void Dispose() => Db.Dispose();
    }

    [Theory]
    [InlineData(UserRole.Owner)] [InlineData(UserRole.Admin)] [InlineData(UserRole.FrontDeskStaff)]
    public async Task ChangeBarberPreservesBookingAndPriceAndRecordsActor(UserRole role)
    {
        using var f = new Fixture(role);
        var oldStart = f.Booking.StartAt;
        Assert.IsType<OkObjectResult>(await f.Controller.Reschedule(f.Booking.Id, f.Request(), default));
        Assert.Single(f.Db.Bookings); Assert.Equal("KEEP-1", f.Booking.BookingNumber);
        Assert.Equal(oldStart, f.Booking.StartAt); Assert.Equal(oldStart.AddHours(1), f.Booking.EndAt);
        Assert.Equal(350, f.Booking.TotalAmount); Assert.Equal(60, Assert.Single(f.Booking.BookingServices).DurationMinutes);
        Assert.Equal(BookingStatus.Confirmed, f.Booking.BookingStatus);
        var assignment = Assert.Single(f.Db.BarberAssignmentEvents);
        Assert.Equal(f.First.Id, assignment.FromBarberId); Assert.Equal(f.Second.Id, assignment.ToBarberId); Assert.Equal(f.Staff.Id, assignment.ChangedByUserId);
        var audit = Assert.Single(f.Db.QueueEvents); Assert.Equal(f.Staff.Id, audit.ChangedByUserId);
        Assert.Equal("Rescheduled", JsonDocument.Parse(audit.Note!).RootElement.GetProperty("Action").GetString());
    }

    [Fact]
    public async Task MoveTimeIgnoresOwnBookingAndResetsArrival()
    {
        using var f = new Fixture();
        var start = f.Booking.StartAt.AddDays(1);
        Assert.IsType<OkObjectResult>(await f.Controller.Reschedule(f.Booking.Id, f.Request(f.First.Id, start), default));
        Assert.Equal(start, f.Booking.StartAt); Assert.Null(f.Booking.CheckedInAt);
        Assert.Equal(BookingStatus.PendingConfirmation, f.Booking.BookingStatus); Assert.Empty(f.Db.BarberAssignmentEvents);
    }

    [Fact]
    public async Task PreviewExcludesSelfAndUsesBookedDurationNotCurrentCatalog()
    {
        using var f = new Fixture();
        var result = Assert.IsType<OkObjectResult>(await f.Controller.GetRescheduleOptions(f.Booking.Id, f.First.Id, null, default));
        var slots = JsonSerializer.SerializeToElement(result.Value).GetProperty("Slots");
        var first = slots.EnumerateArray().First();
        Assert.Equal(f.Booking.StartAt, first.GetProperty("StartAt").GetDateTimeOffset());
        Assert.Equal(TimeSpan.FromHours(1), first.GetProperty("EndAt").GetDateTimeOffset() - first.GetProperty("StartAt").GetDateTimeOffset());
    }

    [Theory]
    [InlineData("booking")] [InlineData("leave")] [InlineData("closure")] [InlineData("holiday")]
    [InlineData("offday")] [InlineData("disabled")] [InlineData("skill")]
    public async Task RejectUnavailableDestination(string type)
    {
        using var f = new Fixture(); var start = f.Booking.StartAt;
        if (type == "booking") f.Db.Bookings.Add(new() { Id = Guid.NewGuid(), BarberId = f.Second.Id, StartAt = start, EndAt = start.AddHours(1), BookingStatus = BookingStatus.Confirmed });
        if (type == "leave") f.Db.LeaveRequests.Add(new() { Id = Guid.NewGuid(), BarberId = f.Second.Id, StartAt = start, EndAt = start.AddHours(1), Status = LeaveStatus.CancellationPending });
        if (type == "closure") f.Db.BarberBookingClosures.Add(new() { Id = Guid.NewGuid(), BarberId = f.Second.Id, StartAt = start, EndAt = start.AddHours(1), Reason = "Absent" });
        if (type == "holiday") f.Db.ShopHolidays.Add(new() { Id = Guid.NewGuid(), HolidayType = HolidayType.Special, HolidayDate = DateOnly.FromDateTime(start.ToOffset(TimeSpan.FromHours(7)).Date) });
        if (type == "offday") foreach (var h in f.Db.BarberWorkingHours.Where(h => h.BarberId == f.Second.Id)) h.IsWorkingDay = false;
        if (type == "disabled") f.Second.AcceptsBooking = false;
        if (type == "skill") f.Second.BarberServices.Add(new() { BarberId = f.Second.Id, ServiceId = Guid.NewGuid() });
        await f.Db.SaveChangesAsync();
        Assert.IsType<BadRequestObjectResult>(await f.Controller.Reschedule(f.Booking.Id, f.Request(), default));
        Assert.Equal(f.First.Id, f.Booking.BarberId); Assert.Empty(f.Db.QueueEvents);
    }

    [Theory]
    [InlineData(BookingStatus.InService)] [InlineData(BookingStatus.WaitingPayment)] [InlineData(BookingStatus.Completed)]
    [InlineData(BookingStatus.Cancelled)] [InlineData(BookingStatus.NoShow)]
    public async Task RejectStartedOrEndedBooking(BookingStatus status)
    {
        using var f = new Fixture(); f.Booking.BookingStatus = status; await f.Db.SaveChangesAsync();
        Assert.IsType<ConflictObjectResult>(await f.Controller.Reschedule(f.Booking.Id, f.Request(), default));
    }

    [Theory]
    [InlineData(UserRole.Barber)] [InlineData(UserRole.Customer)]
    public async Task OnlyShopStaffCanEdit(UserRole role)
    {
        using var f = new Fixture(role);
        Assert.IsType<ForbidResult>(await f.Controller.Reschedule(f.Booking.Id, f.Request(), default));
        Assert.IsType<ForbidResult>(await f.Controller.GetRescheduleOptions(f.Booking.Id, null, null, default));
    }

    [Fact]
    public async Task RejectStaleRetryAndPastTime()
    {
        using var f = new Fixture(); var request = f.Request();
        Assert.IsType<BadRequestObjectResult>(await f.Controller.Reschedule(f.Booking.Id, request with { StartAt = DateTimeOffset.UtcNow.AddDays(-1) }, default));
        Assert.IsType<OkObjectResult>(await f.Controller.Reschedule(f.Booking.Id, request, default));
        Assert.IsType<ConflictObjectResult>(await f.Controller.Reschedule(f.Booking.Id, request, default));
        Assert.Single(f.Db.QueueEvents);
    }

    [Fact]
    public async Task RejectNoChangeMissingReasonAndOutsideHours()
    {
        using var f = new Fixture();
        Assert.IsType<BadRequestObjectResult>(await f.Controller.Reschedule(f.Booking.Id, f.Request(f.First.Id), default));
        Assert.IsType<BadRequestObjectResult>(await f.Controller.Reschedule(f.Booking.Id, f.Request() with { Reason = " " }, default));
        Assert.IsType<BadRequestObjectResult>(await f.Controller.Reschedule(f.Booking.Id, f.Request(start: f.Booking.StartAt.AddHours(-1)), default));
        Assert.IsType<BadRequestObjectResult>(await f.Controller.Reschedule(f.Booking.Id, f.Request(start: f.Booking.StartAt.AddMinutes(30)), default));
        Assert.Empty(f.Db.QueueEvents);
    }

    [Fact]
    public async Task PreservePaymentOnMoveAndNeverCreateAnotherBooking()
    {
        using var f = new Fixture(); f.Booking.PaymentStatus = PaymentStatus.Paid; await f.Db.SaveChangesAsync();
        Assert.IsType<OkObjectResult>(await f.Controller.Reschedule(f.Booking.Id, f.Request(start: f.Booking.StartAt.AddDays(1)), default));
        Assert.Equal(PaymentStatus.Paid, f.Booking.PaymentStatus); Assert.Single(f.Db.Bookings);
        Assert.Equal(350, f.Booking.TotalAmount);
    }

    [Fact]
    public async Task SharedChairStillBlocksOtherBarbersQueue()
    {
        using var f = new Fixture();
        f.First.User.FullName = "ช่างนุค"; f.Second.User.FullName = "ช่างนุ้ย";
        f.Db.Bookings.Add(new() { Id = Guid.NewGuid(), BarberId = f.First.Id, StartAt = f.Booking.StartAt.AddHours(2), EndAt = f.Booking.StartAt.AddHours(3), BookingStatus = BookingStatus.Confirmed });
        await f.Db.SaveChangesAsync();
        Assert.IsType<BadRequestObjectResult>(await f.Controller.Reschedule(f.Booking.Id, f.Request(start: f.Booking.StartAt.AddHours(2)), default));
        Assert.IsType<OkObjectResult>(await f.Controller.Reschedule(f.Booking.Id, f.Request(), default));
    }
}
