using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Queue;
using RodeoBarberShop.Api.Controllers;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;
using Xunit;

namespace RodeoBarberShop.Api.Tests;

public class BarberAddServicesTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task QueueReturnsPhoneFromCorrectCustomerSource(bool member)
    {
        using var f = new Fixture();
        f.Booking.GuestPhoneNumber = "0811111111";
        if (member)
        {
            var customer = new User { Id = Guid.NewGuid(), FullName = "Customer", PhoneNumber = "0822222222", Role = UserRole.Customer };
            f.Db.Users.Add(customer);
            f.Booking.Customer = customer;
            f.Booking.CustomerId = customer.Id;
        }
        await f.Db.SaveChangesAsync();
        var result = Assert.IsType<OkObjectResult>((await f.Controller().GetMyQueue(new DateOnly(2026, 9, 14), default)).Result);
        var bookings = Assert.IsAssignableFrom<IReadOnlyList<QueueBookingResponse>>(result.Value);
        Assert.Equal(member ? "0822222222" : "0811111111", Assert.Single(bookings).CustomerPhoneNumber);
    }

    [Fact]
    public async Task AddsSnapshotPreservesDiscountAndRejectsRetry()
    {
        using var f = new Fixture();
        var request = f.Request();
        var response = Assert.IsType<QueueBookingResponse>(Assert.IsType<OkObjectResult>((await f.Controller().AddServices(f.Booking.Id, request, default)).Result).Value);
        Assert.True(Assert.Single(response.Services).AddedDuringService);
        Assert.NotNull(Assert.Single(response.Services).CreatedAt);
        Assert.Equal(450, f.Booking.SubtotalAmount);
        Assert.Equal(430, f.Booking.TotalAmount);
        Assert.Equal(90, f.Booking.EstimatedDurationMinutes);
        Assert.Equal(request.ExpectedEndAt.AddMinutes(30), f.Booking.EndAt);
        var added = Assert.Single(f.Booking.BookingServices);
        Assert.True(added.AddedDuringService);
        Assert.Equal(100, added.UnitPrice);
        Assert.Equal(f.User.Id, Assert.Single(f.Db.QueueEvents).ChangedByUserId);
        Assert.IsType<ConflictObjectResult>((await f.Controller().AddServices(f.Booking.Id, request, default)).Result);
        Assert.Single(f.Booking.BookingServices);
    }

    [Theory]
    [InlineData(BookingStatus.Confirmed, PaymentStatus.Unpaid)]
    [InlineData(BookingStatus.WaitingPayment, PaymentStatus.Unpaid)]
    [InlineData(BookingStatus.Completed, PaymentStatus.Paid)]
    [InlineData(BookingStatus.InService, PaymentStatus.Paid)]
    public async Task RejectsWrongState(BookingStatus status, PaymentStatus payment)
    {
        using var f = new Fixture();
        f.Booking.BookingStatus = status;
        f.Booking.PaymentStatus = payment;
        await f.Db.SaveChangesAsync();
        Assert.IsType<ConflictObjectResult>((await f.Controller().AddServices(f.Booking.Id, f.Request(), default)).Result);
        Assert.Empty(f.Db.QueueEvents);
    }

    [Fact]
    public async Task OtherBarberIsForbidden()
    {
        using var f = new Fixture();
        Assert.IsType<ForbidResult>((await f.Controller(Guid.NewGuid()).AddServices(f.Booking.Id, f.Request(), default)).Result);
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(29, false)]
    [InlineData(30, true)]
    public async Task ChecksOverlapWithExactBoundary(int minutesAfterEnd, bool allowed)
    {
        using var f = new Fixture();
        f.Db.Bookings.Add(new Booking { Id = Guid.NewGuid(), BarberId = f.Booking.BarberId, BookingStatus = BookingStatus.Confirmed, StartAt = f.Booking.EndAt.AddMinutes(minutesAfterEnd), EndAt = f.Booking.EndAt.AddHours(2) });
        await f.Db.SaveChangesAsync();
        var result = (await f.Controller().AddServices(f.Booking.Id, f.Request(), default)).Result;
        if (allowed) Assert.IsType<OkObjectResult>(result);
        else { Assert.IsType<ConflictObjectResult>(result); Assert.Empty(f.Db.QueueEvents); }
    }

    [Fact]
    public async Task RejectsOutsideWorkingHoursAndStalePrice()
    {
        using var f = new Fixture();
        var request = f.Request();
        Assert.IsType<ConflictObjectResult>((await f.Controller().AddServices(f.Booking.Id, request with { ExpectedAddedAmount = 99 }, default)).Result);
        f.Db.BarberWorkingHours.Single().EndTime = new TimeOnly(11, 0);
        await f.Db.SaveChangesAsync();
        Assert.IsType<ConflictObjectResult>((await f.Controller().AddServices(f.Booking.Id, request, default)).Result);
        Assert.Empty(f.Db.QueueEvents);
    }

    [Fact]
    public async Task RejectsDisabledUnsupportedAndDuplicateServices()
    {
        using var f = new Fixture();
        f.Service.IsActive = false;
        await f.Db.SaveChangesAsync();
        Assert.IsType<BadRequestObjectResult>((await f.Controller().AddServices(f.Booking.Id, f.Request(), default)).Result);
        f.Service.IsActive = true;
        f.Db.BarberServices.Add(new BarberService { BarberId = f.Booking.BarberId!.Value, ServiceId = Guid.NewGuid() });
        await f.Db.SaveChangesAsync();
        Assert.IsType<BadRequestObjectResult>((await f.Controller().AddServices(f.Booking.Id, f.Request(), default)).Result);
        Assert.IsType<BadRequestObjectResult>((await f.Controller().AddServices(f.Booking.Id, f.Request() with { ServiceIds = [f.Service.Id, f.Service.Id] }, default)).Result);
        Assert.Empty(f.Db.QueueEvents);
    }

    private sealed class Fixture : IDisposable
    {
        public ApplicationDbContext Db { get; } = new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public User User { get; } = new() { Id = Guid.NewGuid(), FullName = "Test barber", Role = UserRole.Barber };
        public Service Service { get; } = new() { Id = Guid.NewGuid(), Name = "Shampoo", Price = 100, DurationMinutes = 30, IsActive = true };
        public Booking Booking { get; }
        public Fixture()
        {
            var barber = new BarberProfile { Id = Guid.NewGuid(), UserId = User.Id, User = User };
            var start = new DateTimeOffset(2026, 9, 14, 3, 0, 0, TimeSpan.Zero);
            Booking = new Booking { Id = Guid.NewGuid(), Barber = barber, BarberId = barber.Id, BookingStatus = BookingStatus.InService, PaymentStatus = PaymentStatus.Unpaid, StartAt = start, EndAt = start.AddHours(1), EstimatedDurationMinutes = 60, SubtotalAmount = 350, DiscountAmount = 20, TotalAmount = 330 };
            Db.Bookings.Add(Booking);
            Db.Services.Add(Service);
            Db.BarberWorkingHours.Add(new BarberWorkingHour { Id = Guid.NewGuid(), BarberId = barber.Id, DayOfWeek = 1, StartTime = new TimeOnly(10, 0), EndTime = new TimeOnly(20, 0), IsWorkingDay = true });
            Db.SaveChanges();
        }
        public AddQueueServicesRequest Request() => new([Service.Id], Booking.EndAt, Booking.TotalAmount, Service.Price, Service.DurationMinutes);
        public QueueController Controller(Guid? userId = null) => new(Db) { ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, (userId ?? User.Id).ToString()), new Claim(ClaimTypes.Role, "Barber")], "Test")) } } };
        public void Dispose() => Db.Dispose();
    }
}
