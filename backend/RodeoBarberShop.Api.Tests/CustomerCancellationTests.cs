using System.Security.Claims;
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

public class CustomerCancellationTests
{
    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => new(2026, 9, 20, 3, 0, 0, TimeSpan.Zero);
    }

    private sealed class Fixture : IDisposable
    {
        public ApplicationDbContext Db { get; } = new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public Booking Booking { get; }
        public BookingsController Controller { get; }
        public Fixture(int seconds = 3600, string role = "Customer", bool owner = true)
        {
            var user = new User { Id = Guid.NewGuid(), FullName = "Customer" };
            Booking = new Booking { Id = Guid.NewGuid(), CustomerId = user.Id, Customer = user,
                StartAt = new Clock().GetUtcNow().AddSeconds(seconds), BookingStatus = BookingStatus.PendingConfirmation };
            Db.Bookings.Add(Booking);
            Db.SaveChanges();
            Controller = new(Db, new Clock()) { ControllerContext = new() { HttpContext = new DefaultHttpContext {
                User = new ClaimsPrincipal(new ClaimsIdentity([
                    new Claim(ClaimTypes.NameIdentifier, (owner ? user.Id : Guid.NewGuid()).ToString()),
                    new Claim(ClaimTypes.Role, role)], "Test")) } } };
        }
        public void Dispose() => Db.Dispose();
    }

    [Theory]
    [InlineData(3601, true)]
    [InlineData(3600, true)]
    [InlineData(3599, false)]
    [InlineData(-1, false)]
    public async Task EnforcesOneHourBoundary(int seconds, bool allowed)
    {
        using var f = new Fixture(seconds);
        var result = await f.Controller.CancelBooking(f.Booking.Id, new(" Changed plans "), default);
        if (allowed)
        {
            Assert.IsType<OkObjectResult>(result.Result);
            Assert.Equal(BookingStatus.Cancelled, f.Booking.BookingStatus);
            Assert.Equal("Changed plans", f.Booking.CancelReason);
            Assert.Equal(new Clock().GetUtcNow(), f.Booking.CancelledAt);
        }
        else
        {
            Assert.IsType<BadRequestObjectResult>(result.Result);
            Assert.Equal(BookingStatus.PendingConfirmation, f.Booking.BookingStatus);
        }
        Assert.Single(f.Db.Bookings);
    }

    [Theory]
    [InlineData(null)] [InlineData("")] [InlineData("   ")]
    public async Task RequiresReason(string? reason)
    {
        using var f = new Fixture();
        Assert.IsType<BadRequestObjectResult>((await f.Controller.CancelBooking(f.Booking.Id, new(reason), default)).Result);
    }

    [Theory]
    [InlineData(BookingStatus.Confirmed)] [InlineData(BookingStatus.WaitingService)]
    [InlineData(BookingStatus.InService)] [InlineData(BookingStatus.WaitingPayment)]
    [InlineData(BookingStatus.Completed)] [InlineData(BookingStatus.NoShow)] [InlineData(BookingStatus.Cancelled)]
    public async Task RejectsOtherStatuses(BookingStatus status)
    {
        using var f = new Fixture();
        f.Booking.BookingStatus = status;
        await f.Db.SaveChangesAsync();
        Assert.IsType<BadRequestObjectResult>((await f.Controller.CancelBooking(f.Booking.Id, new("Reason"), default)).Result);
        Assert.Equal(status, f.Booking.BookingStatus);
    }

    [Fact]
    public async Task RejectsOtherCustomerAndUnknownBooking()
    {
        using var f = new Fixture(owner: false);
        Assert.IsType<ForbidResult>((await f.Controller.CancelBooking(f.Booking.Id, new("Reason"), default)).Result);
        Assert.IsType<NotFoundResult>((await f.Controller.CancelBooking(Guid.NewGuid(), new("Reason"), default)).Result);
    }

    [Fact]
    public async Task RepeatDoesNotOverwriteCancellation()
    {
        using var f = new Fixture();
        await f.Controller.CancelBooking(f.Booking.Id, new("First"), default);
        Assert.IsType<BadRequestObjectResult>((await f.Controller.CancelBooking(f.Booking.Id, new("Second"), default)).Result);
        Assert.Equal("First", f.Booking.CancelReason);
    }

    [Theory]
    [InlineData("Owner")] [InlineData("Admin")] [InlineData("FrontDeskStaff")]
    public async Task StaffRetainsExistingCutoffAndReasonRules(string role)
    {
        using var f = new Fixture(-1, role, false);
        Assert.IsType<OkObjectResult>((await f.Controller.CancelBooking(f.Booking.Id, new(null), default)).Result);
    }
}
