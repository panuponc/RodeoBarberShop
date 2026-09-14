using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Controllers;
using RodeoBarberShop.Api.Contracts.Bookings;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;
using Xunit;

namespace RodeoBarberShop.Api.Tests;

public class BarberBookingClosureTests
{
    private sealed class Clock(DateTimeOffset now) : TimeProvider { public override DateTimeOffset GetUtcNow() => now.ToUniversalTime(); }
    [Theory]
    [InlineData(UserRole.Owner)]
    [InlineData(UserRole.Admin)]
    [InlineData(UserRole.FrontDeskStaff)]
    public async Task StaffCanCloseTodayAndReopenWithoutChangingLeavesOrBookings(UserRole role)
    {
        using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var now = new DateTimeOffset(DateTime.SpecifyKind(DateTime.UtcNow.AddDays(2).Date.AddHours(12), DateTimeKind.Unspecified), TimeSpan.FromHours(7));
        var staff = new User { Id = Guid.NewGuid(), Role = role, AccountStatus = AccountStatus.Active };
        var barber = new BarberProfile { Id = Guid.NewGuid(), User = new User { Id = Guid.NewGuid(), Role = UserRole.Barber, AccountStatus = AccountStatus.Active } };
        var service = new Service { Id = Guid.NewGuid(), Name = "Cut", DurationMinutes = 60, IsActive = true };
        db.Users.Add(staff); db.BarberProfiles.Add(barber); db.Services.Add(service);
        for (var day=0; day<7; day++) db.BarberWorkingHours.Add(new() { Id=Guid.NewGuid(),BarberId=barber.Id,DayOfWeek=day,IsWorkingDay=true,StartTime=new(10,0),EndTime=new(21,0) });
        var existing = new Booking { Id=Guid.NewGuid(),BarberId=barber.Id,StartAt=now.AddHours(1),EndAt=now.AddHours(2),BookingStatus=BookingStatus.Confirmed };
        db.Bookings.Add(existing); await db.SaveChangesAsync();
        var context = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier,staff.Id.ToString()),new Claim(ClaimTypes.Role,role.ToString())],"Test")) } };
        var controller = new BarberBookingClosuresController(db,new Clock(now)) { ControllerContext=context };
        Assert.Equal(201,Assert.IsType<ObjectResult>(await controller.Close(barber.Id,new("Absent"),default)).StatusCode);
        var closure=Assert.Single(db.BarberBookingClosures); Assert.Equal(now.AddHours(9),closure.EndAt); Assert.Equal(staff.Id,closure.ClosedByUserId);
        Assert.Empty(db.LeaveRequests); Assert.Equal(BookingStatus.Confirmed,existing.BookingStatus);
        Assert.IsType<ConflictObjectResult>(await controller.Close(barber.Id,new("Retry"),default));
        var bookings = new BookingsController(db) { ControllerContext=context };
        async Task<IReadOnlyList<AvailabilitySlotResponse>> Slots(DateOnly date) => Assert.IsAssignableFrom<IReadOnlyList<AvailabilitySlotResponse>>(Assert.IsType<OkObjectResult>((await bookings.GetAvailability(barber.Id,date,[service.Id],default)).Result).Value);
        var date=DateOnly.FromDateTime(now.Date);
        Assert.False((await Slots(date)).Single(s=>s.StartAt==now.AddHours(3)).IsAvailable);
        Assert.All(await Slots(date.AddDays(1)),s=>Assert.True(s.IsAvailable));
        Assert.IsType<BadRequestObjectResult>((await bookings.CreateStaffBooking(new(null,"Guest","0812345678",null,barber.Id,now.AddHours(3),[service.Id],null),default)).Result);
        Assert.IsType<OkObjectResult>(await controller.Reopen(barber.Id,closure.Id,default));
        Assert.Equal(staff.Id,closure.ReopenedByUserId); Assert.NotNull(closure.ReopenedAt);
        Assert.True((await Slots(date)).Single(s=>s.StartAt==now.AddHours(3)).IsAvailable);
        Assert.IsType<ConflictObjectResult>(await controller.Reopen(barber.Id,closure.Id,default));
        db.LeaveRequests.Add(new(){Id=Guid.NewGuid(),BarberId=barber.Id,StartAt=now.AddHours(3),EndAt=now.AddHours(4),Status=LeaveStatus.Approved});await db.SaveChangesAsync();
        Assert.False((await Slots(date)).Single(s=>s.StartAt==now.AddHours(3)).IsAvailable);
        var afterClosing=new BarberBookingClosuresController(db,new Clock(now.AddHours(9))) {ControllerContext=context};
        Assert.IsType<BadRequestObjectResult>(await afterClosing.Close(barber.Id,new("Too late"),default));
        Assert.IsType<BadRequestObjectResult>(await afterClosing.Reopen(barber.Id,closure.Id,default));
        var beforeOpening = new BarberBookingClosuresController(db,new Clock(now.AddHours(-3))) { ControllerContext=context };
        Assert.IsType<BadRequestObjectResult>(await beforeOpening.Close(barber.Id,new("Too early"),default));
        var tomorrow = date.AddDays(1);
        Assert.Equal(201, Assert.IsType<ObjectResult>(await controller.Close(barber.Id,new("Tomorrow", tomorrow),default)).StatusCode);
        var futureClosure = db.BarberBookingClosures.Single(c => c.Id != closure.Id);
        Assert.Equal(new DateTimeOffset(tomorrow.ToDateTime(new TimeOnly(10,0)),TimeSpan.FromHours(7)),futureClosure.StartAt);
        Assert.False((await Slots(tomorrow)).First().IsAvailable);
        Assert.IsType<OkObjectResult>(await afterClosing.Reopen(barber.Id,futureClosure.Id,default));
        Assert.All(await Slots(tomorrow),s=>Assert.True(s.IsAvailable));
        Assert.IsType<BadRequestObjectResult>(await controller.Close(barber.Id,new("Past",date.AddDays(-1)),default));
        var leaveNow = new LeaveRequest { Id=Guid.NewGuid(),BarberId=barber.Id,StartAt=now.AddMinutes(-1),EndAt=now.AddHours(1),Status=LeaveStatus.Approved };
        db.LeaveRequests.Add(leaveNow); await db.SaveChangesAsync();
        Assert.IsType<ConflictObjectResult>(await controller.Close(barber.Id,new("Already on leave"),default));
        leaveNow.Status=LeaveStatus.Cancelled;
        var holiday=new ShopHoliday {Id=Guid.NewGuid(),HolidayType=HolidayType.Special,HolidayDate=date};
        db.ShopHolidays.Add(holiday);await db.SaveChangesAsync();
        Assert.IsType<BadRequestObjectResult>(await controller.Close(barber.Id,new("Holiday"),default));
        db.ShopHolidays.Remove(holiday);barber.AcceptsBooking=false;await db.SaveChangesAsync();
        Assert.IsType<BadRequestObjectResult>(await controller.Close(barber.Id,new("Disabled"),default));
        Assert.Equal(2,db.BarberBookingClosures.Count());
        staff.Role=UserRole.Barber;await db.SaveChangesAsync();
        Assert.IsType<ForbidResult>(await controller.Close(barber.Id,new("Forbidden"),default));
    }
}
