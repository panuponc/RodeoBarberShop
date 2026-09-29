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

public class BookingChairAvailabilityTests
{
    private sealed class Fixture : IDisposable
    {
        public ApplicationDbContext Db { get; } = new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public User Staff { get; } = new() { Id = Guid.NewGuid(), Role = UserRole.Owner, AccountStatus = AccountStatus.Active };
        public BarberProfile First { get; } = new() { Id = Guid.NewGuid(), IsAvailable = true, AcceptsBooking = true,
            User = new() { Id = Guid.NewGuid(), FullName = "First", Role = UserRole.Barber, AccountStatus = AccountStatus.Active } };
        public BarberProfile Second { get; } = new() { Id = Guid.NewGuid(), IsAvailable = true, AcceptsBooking = true,
            User = new() { Id = Guid.NewGuid(), FullName = "Second", Role = UserRole.Barber, AccountStatus = AccountStatus.Active } };
        public Service Service { get; } = new() { Id = Guid.NewGuid(), Name = "Cut", DurationMinutes = 60, Price = 300, IsActive = true };
        public Chair Chair { get; } = new() { Id = Guid.NewGuid(), Name = "Chair 1", IsActive = true };
        public DateOnly Date { get; } = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3));
        public BookingsController Controller { get; }

        public Fixture()
        {
            Db.Users.Add(Staff);
            Db.BarberProfiles.AddRange(First, Second);
            Db.Services.Add(Service);
            Db.Chairs.Add(Chair);
            foreach (var barber in new[] { First, Second })
                Db.BarberWorkingHours.Add(new() { Id = Guid.NewGuid(), BarberId = barber.Id,
                    DayOfWeek = (int)Date.DayOfWeek, IsWorkingDay = true, StartTime = new(10, 0), EndTime = new(21, 0) });
            Db.SaveChanges();
            Controller = new(Db) { ControllerContext = new() { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(
                new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, Staff.Id.ToString()),
                    new Claim(ClaimTypes.Role, Staff.Role.ToString())], "Test")) } } };
        }

        public DateTimeOffset Start(int hour = 10) => new(Date.ToDateTime(new(hour, 0)), TimeSpan.FromHours(7));
        public void Assign(BarberProfile barber) => Db.BarberChairAssignments.Add(new() { Id = Guid.NewGuid(),
            ChairId = Chair.Id, BarberId = barber.Id, StartDate = Date.AddDays(-1), IsPrimary = true });
        public async Task<IReadOnlyList<AvailabilitySlotResponse>> Slots(BarberProfile barber) =>
            Assert.IsAssignableFrom<IReadOnlyList<AvailabilitySlotResponse>>(Assert.IsType<OkObjectResult>(
                (await Controller.GetAvailability(barber.Id, Date, [Service.Id], default)).Result).Value);
        public void Dispose() => Db.Dispose();
    }

    [Fact]
    public async Task ConfiguredShopHidesAndRejectsBarberWithoutChair()
    {
        using var f = new Fixture();
        Assert.Empty(await f.Slots(f.First));
        var result = await f.Controller.CreateStaffBooking(new(null, "Guest", "0812345678", null,
            f.First.Id, f.Start(), [f.Service.Id], null), default);
        var bad = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Contains("ไม่มีเก้าอี้", bad.Value!.ToString());
        Assert.Empty(f.Db.Bookings);
    }

    [Fact]
    public async Task AssignedChairProvidesSlotsAndSharedChairBlocksBothBarbers()
    {
        using var f = new Fixture();
        f.Assign(f.First);
        f.Assign(f.Second);
        f.Db.Bookings.Add(new() { Id = Guid.NewGuid(), BarberId = f.First.Id, StartAt = f.Start().ToUniversalTime(),
            EndAt = f.Start().AddHours(1).ToUniversalTime(), BookingStatus = BookingStatus.Confirmed });
        await f.Db.SaveChangesAsync();

        var first = await f.Slots(f.First);
        var second = await f.Slots(f.Second);
        Assert.False(first.Single(slot => slot.StartAt == f.Start()).IsAvailable);
        Assert.False(second.Single(slot => slot.StartAt == f.Start()).IsAvailable);
        Assert.True(second.Single(slot => slot.StartAt == f.Start(11)).IsAvailable);
    }

    [Fact]
    public async Task EndedOrInactiveChairAssignmentDoesNotQualify()
    {
        using var f = new Fixture();
        f.Db.BarberChairAssignments.Add(new() { Id = Guid.NewGuid(), ChairId = f.Chair.Id, BarberId = f.First.Id,
            StartDate = f.Date.AddDays(-5), EndDate = f.Date.AddDays(-1) });
        await f.Db.SaveChangesAsync();
        Assert.Empty(await f.Slots(f.First));

        f.Chair.IsActive = false;
        f.Assign(f.First);
        await f.Db.SaveChangesAsync();
        Assert.Empty(await f.Slots(f.First));
    }
}
