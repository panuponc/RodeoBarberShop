using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Contracts.Barbers;
using RodeoBarberShop.Api.Contracts.Services;
using RodeoBarberShop.Api.Controllers;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;
using Xunit;

namespace RodeoBarberShop.Api.Tests;

public class ServiceManagementTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(46)]
    [InlineData(90)]
    [InlineData(780)]
    [InlineData(int.MaxValue)]
    public async Task RejectsInvalidDurationsForCreateAndUpdate(int minutes)
    {
        using var fixture = new Fixture();
        var controller = new ServicesController(fixture.Db);
        Assert.IsType<BadRequestObjectResult>((await controller.CreateService(new("New", null, 300, minutes), default)).Result);
        Assert.IsType<BadRequestObjectResult>((await controller.UpdateService(fixture.Active.Id, new("Haircut", null, 300, minutes, true), default)).Result);
        Assert.Equal(60, fixture.Active.DurationMinutes);
    }

    [Fact]
    public async Task PublicListExcludesInactiveButManagementListIncludesIt()
    {
        using var fixture = new Fixture();
        fixture.Inactive.IsActive = false;
        await fixture.Db.SaveChangesAsync();

        var controller = new ServicesController(fixture.Db);
        var publicServices = Value<IReadOnlyList<ServiceResponse>>(await controller.GetServices(default));
        var managedServices = Value<IReadOnlyList<ServiceResponse>>(await controller.GetManagedServices(default));

        Assert.Single(publicServices);
        Assert.Equal(2, managedServices.Count);
        Assert.True(managedServices[0].IsActive);
        Assert.False(managedServices[1].IsActive);
    }

    [Fact]
    public async Task CreateAndUpdateRejectDuplicateNamesIgnoringCase()
    {
        using var fixture = new Fixture();
        var controller = new ServicesController(fixture.Db);

        Assert.IsType<ConflictObjectResult>((await controller.CreateService(
            new CreateServiceRequest("  haircut  ", null, 400, 60), default)).Result);
        Assert.IsType<ConflictObjectResult>((await controller.UpdateService(
            fixture.Inactive.Id,
            new UpdateServiceRequest("HAIRCUT", null, 500, 120, true), default)).Result);
    }

    [Fact]
    public async Task DisablingServicePreservesRecordAndHidesItFromPublicList()
    {
        using var fixture = new Fixture();
        fixture.Inactive.IsActive = false;
        await fixture.Db.SaveChangesAsync();
        var controller = new ServicesController(fixture.Db);

        Assert.IsType<NoContentResult>(await controller.DeleteService(fixture.Active.Id, default));

        Assert.Equal(2, await fixture.Db.Services.CountAsync());
        Assert.False((await fixture.Db.Services.FindAsync(fixture.Active.Id))!.IsActive);
        Assert.Empty(Value<IReadOnlyList<ServiceResponse>>(await controller.GetServices(default)));
    }

    [Fact]
    public async Task DedicatedBarberServiceUpdateChangesOnlyMappings()
    {
        using var fixture = new Fixture();
        var controller = new BarbersController(fixture.Db);
        var originalName = fixture.Barber.User.FullName;
        var originalPhone = fixture.Barber.User.PhoneNumber;

        var result = await controller.UpdateBarberServices(
            fixture.Barber.Id,
            new UpdateBarberServicesRequest([fixture.Active.Id]),
            default);

        var response = Value<BarberResponse>(result);
        Assert.Equal(fixture.Active.Id, Assert.Single(response.Services).ServiceId);
        Assert.Equal(originalName, fixture.Barber.User.FullName);
        Assert.Equal(originalPhone, fixture.Barber.User.PhoneNumber);
    }

    [Fact]
    public async Task BarberServiceUpdateRejectsInactiveDuplicateAndUnknownServices()
    {
        using var fixture = new Fixture();
        fixture.Inactive.IsActive = false;
        await fixture.Db.SaveChangesAsync();
        var controller = new BarbersController(fixture.Db);

        Assert.IsType<BadRequestObjectResult>((await controller.UpdateBarberServices(
            fixture.Barber.Id, new UpdateBarberServicesRequest([fixture.Active.Id, fixture.Active.Id]), default)).Result);
        Assert.IsType<BadRequestObjectResult>((await controller.UpdateBarberServices(
            fixture.Barber.Id, new UpdateBarberServicesRequest([fixture.Inactive.Id]), default)).Result);
        Assert.IsType<BadRequestObjectResult>((await controller.UpdateBarberServices(
            fixture.Barber.Id, new UpdateBarberServicesRequest([Guid.NewGuid()]), default)).Result);
    }

    private static T Value<T>(ActionResult<T> result) => Assert.IsAssignableFrom<T>(Assert.IsType<OkObjectResult>(result.Result).Value);

    private sealed class Fixture : IDisposable
    {
        public ApplicationDbContext Db { get; }
        public Service Active { get; }
        public Service Inactive { get; }
        public BarberProfile Barber { get; }

        public Fixture()
        {
            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            Db = new ApplicationDbContext(options);
            var now = DateTimeOffset.UtcNow;
            Active = new Service { Id = Guid.NewGuid(), Name = "Haircut", Price = 300, DurationMinutes = 60, IsActive = true, CreatedAt = now, UpdatedAt = now };
            Inactive = new Service { Id = Guid.NewGuid(), Name = "Perm", Price = 1200, DurationMinutes = 180, IsActive = true, CreatedAt = now, UpdatedAt = now };
            var user = new User
            {
                Id = Guid.NewGuid(), FullName = "Test Barber", Email = "barber@test.local", PhoneNumber = "0812345678",
                PasswordHash = "test", Role = UserRole.Barber, AccountStatus = AccountStatus.Active, CreatedAt = now, UpdatedAt = now
            };
            Barber = new BarberProfile
            {
                Id = Guid.NewGuid(), User = user, UserId = user.Id, IsAvailable = true, AcceptsBooking = true,
                CreatedAt = now, UpdatedAt = now
            };
            Db.AddRange(Active, Inactive, user, Barber);
            Db.SaveChanges();
        }

        public void Dispose() => Db.Dispose();
    }
}
