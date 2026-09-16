using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RodeoBarberShop.Api.Contracts.Bookings;
using RodeoBarberShop.Api.Contracts.Leaves;
using RodeoBarberShop.Api.Controllers;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;
using Xunit;

namespace RodeoBarberShop.Api.Tests;

public sealed class LocalPostgresTheoryAttribute : TheoryAttribute
{
    public LocalPostgresTheoryAttribute()
    {
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("RODEO_TEST_POSTGRES")))
            Skip = "Requires an explicitly configured disposable local PostgreSQL server.";
    }
}

public class PostgresConcurrencyTests
{
    [LocalPostgresTheory]
    [InlineData("book-book", false)] [InlineData("book-book", true)]
    [InlineData("move-book", false)] [InlineData("move-book", true)]
    [InlineData("move-move", false)] [InlineData("move-move", true)]
    [InlineData("leave-book", false)] [InlineData("leave-book", true)]
    public async Task CompetingWritersCannotCommitConflictingAppointments(string scenario, bool reverse)
    {
        var settings = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("RODEO_TEST_POSTGRES"));
        // Never accept application configuration or a remote host for these destructive test fixtures.
        Assert.Equal("127.0.0.1", settings.Host);
        Assert.Equal(55439, settings.Port);
        Assert.Equal("rodeo_concurrency_test", settings.Database);
        settings.Pooling = false;
        var database = $"rodeo_concurrency_{Guid.NewGuid():N}";
        var adminSettings = new NpgsqlConnectionStringBuilder(settings.ConnectionString) { Database = "postgres" };
        await using var admin = new NpgsqlConnection(adminSettings.ConnectionString);
        await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{database}\"", admin)) await create.ExecuteNonQueryAsync();
        settings.Database = database;
        settings.CommandTimeout = 30;
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(settings.ConnectionString).Options;
        try
        {
            await RunRace(options, settings.ConnectionString, scenario, reverse);
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP DATABASE \"{database}\"", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private static User UserFor(UserRole role) => new() { Id = Guid.NewGuid(), FullName = role.ToString(),
        Email = $"{Guid.NewGuid():N}@test.invalid", PhoneNumber = "0800000000", PasswordHash = "not-a-login",
        Role = role, AccountStatus = AccountStatus.Active };

    private static ControllerContext Identity(User user) => new() { HttpContext = new DefaultHttpContext {
        User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Role, user.Role.ToString())], "Test")) } };

    private static async Task RunRace(DbContextOptions<ApplicationDbContext> options, string connectionString, string scenario, bool reverse)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(45));
        var ct = timeout.Token;
        var staff = UserFor(UserRole.Owner);
        var customer = UserFor(UserRole.Customer);
        var source = new BarberProfile { Id = Guid.NewGuid(), User = UserFor(UserRole.Barber) };
        var target = new BarberProfile { Id = Guid.NewGuid(), User = UserFor(UserRole.Barber) };
        var service = new Service { Id = Guid.NewGuid(), Name = "Test cut", IsActive = true, DurationMinutes = 60, Price = 350 };
        var day = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7));
        var slot = new DateTimeOffset(day.ToDateTime(new TimeOnly(12, 0)), TimeSpan.FromHours(7)).ToUniversalTime();
        // PostgreSQL stores microseconds, so use an exactly representable optimistic concurrency token.
        var version = slot.AddDays(-10);
        Booking Original(int hours) => new() { Id = Guid.NewGuid(), BookingNumber = $"ORIGINAL-{hours}",
            BarberId = source.Id, StartAt = slot.AddHours(-hours), EndAt = slot.AddHours(1 - hours),
            BookingStatus = BookingStatus.Confirmed, UpdatedAt = version, TotalAmount = 350, SubtotalAmount = 350,
            EstimatedDurationMinutes = 60, BookingServices = [new() { Id = Guid.NewGuid(), ServiceId = service.Id,
                ServiceName = service.Name, DurationMinutes = 60, Quantity = 1, UnitPrice = 350, LineTotal = 350 }] };
        var original = Original(2);
        var other = Original(1);
        var leave = new LeaveRequest { Id = Guid.NewGuid(), BarberId = target.Id, StartAt = slot, EndAt = slot.AddHours(1),
            LeaveType = "Sick", Reason = "Test only", Status = LeaveStatus.Pending };
        await using (var seed = new ApplicationDbContext(options))
        {
            await seed.Database.EnsureCreatedAsync(ct);
            seed.Users.AddRange(staff, customer);
            seed.BarberProfiles.AddRange(source, target); seed.Services.Add(service);
            foreach (var barber in new[] { source, target }) seed.BarberWorkingHours.Add(new() {
                Id = Guid.NewGuid(), BarberId = barber.Id, DayOfWeek = (int)day.DayOfWeek,
                IsWorkingDay = true, StartTime = new(10, 0), EndTime = new(21, 0) });
            seed.Bookings.AddRange(original, other); seed.LeaveRequests.Add(leave);
            await seed.SaveChangesAsync(ct);
        }

        async Task<IActionResult> Execute(string operation)
        {
            await using var db = new ApplicationDbContext(options);
            var controller = new BookingsController(db) { ControllerContext = Identity(staff) };
            if (operation == "staff-book") return (await controller.CreateStaffBooking(
                new(null, "Test guest", "0800000001", null, target.Id, slot, [service.Id], null), ct)).Result!;
            if (operation == "customer-book")
            {
                controller.ControllerContext = Identity(customer);
                return (await controller.CreateBooking(new(target.Id, slot, [service.Id], null), ct)).Result!;
            }
            if (operation == "leave") return (await new LeavesController(db) { ControllerContext = Identity(staff) }
                .Approve(leave.Id, new ReviewLeaveRequest("Test approval", []), ct)).Result!;
            return await controller.Reschedule(operation == "move-other" ? other.Id : original.Id,
                new(target.Id, slot, version, "Customer agreed"), ct);
        }

        var left = scenario switch { "book-book" => "staff-book", "leave-book" => "leave", _ => "move" };
        var right = scenario == "move-move" ? "move-other" : "customer-book";
        if (reverse) (left, right) = (right, left);

        await using var gate = new NpgsqlConnection(connectionString);
        await gate.OpenAsync(ct);
        await using var transaction = await gate.BeginTransactionAsync(ct);
        await using (var hold = new NpgsqlCommand("LOCK TABLE bookings IN SHARE ROW EXCLUSIVE MODE", gate, transaction))
            await hold.ExecuteNonQueryAsync(ct);

        // Confirm real lock contention on separate PostgreSQL sessions, not just Task scheduling.
        async Task WaitForBlockedWriters(int count)
        {
            for (var attempt = 0; attempt < 100; attempt++)
            {
                await using var monitor = new NpgsqlCommand("SELECT count(*) FROM pg_locks WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database()) AND relation = 'bookings'::regclass AND NOT granted", gate, transaction);
                if (Convert.ToInt32(await monitor.ExecuteScalarAsync(ct)) >= count) return;
                await Task.Delay(50, ct);
            }
            Assert.Fail($"Did not observe {count} concurrent blocked booking writers");
        }

        Task<IActionResult>? first = null;
        Task<IActionResult>? second = null;
        try
        {
            first = Execute(left);
            await WaitForBlockedWriters(1);
            second = Execute(right);
            await WaitForBlockedWriters(2);
        }
        finally
        {
            await transaction.CommitAsync(CancellationToken.None);
            // Drain writers before disposing the fixture, including failed barrier assertions.
            if (first is not null && second is not null) await Task.WhenAll(first, second);
            else if (first is not null) await first;
        }
        var results = await Task.WhenAll(first!, second!);
        static int Status(IActionResult result) => Assert.IsAssignableFrom<ObjectResult>(result).StatusCode ?? 200;
        Assert.InRange(Status(results[0]), 200, 299);
        Assert.Contains(Status(results[1]), new[] { 400, 409 });
        Assert.NotNull(Assert.IsAssignableFrom<ObjectResult>(results[1]).Value);

        await using var verify = new ApplicationDbContext(options);
        var collisions = await verify.Bookings.CountAsync(b => b.BarberId == target.Id && b.StartAt < slot.AddHours(1)
            && b.EndAt > slot && b.BookingStatus != BookingStatus.Cancelled, ct);
        var approved = await verify.LeaveRequests.AnyAsync(l => l.Id == leave.Id && l.Status == LeaveStatus.Approved, ct);
        Assert.Equal(1, collisions + (approved ? 1 : 0));
        var moves = await verify.QueueEvents.CountAsync(e => e.Note != null && e.Note.Contains("Rescheduled"), ct);
        Assert.Equal(left.StartsWith("move") ? 1 : 0, moves);
        Assert.Equal(2 + (left.EndsWith("book") ? 1 : 0), await verify.Bookings.CountAsync(ct));
        if (!left.StartsWith("move")) Assert.Equal(source.Id, (await verify.Bookings.FindAsync([original.Id], ct))!.BarberId);
    }
}
