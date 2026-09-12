using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using RodeoBarberShop.Api.Contracts.Payments;
using RodeoBarberShop.Api.Contracts.Queue;
using RodeoBarberShop.Api.Controllers;
using RodeoBarberShop.Api.Data;
using RodeoBarberShop.Api.Entities;
using RodeoBarberShop.Api.Enums;
using RodeoBarberShop.Api.Services.Payments;
using Xunit;

namespace RodeoBarberShop.Api.Tests;

public class BarberPaymentTests
{
    [Theory]
    [InlineData("Cash")]
    [InlineData("QrPayment")]
    public async Task BarberCanCollectOwnPaymentAndReadReceipt(string method)
    {
        using var fixture = new Fixture();
        var controller = fixture.Controller();
        var summary = Assert.IsType<OkObjectResult>((await controller.GetBookingPaymentSummary(fixture.Booking.Id, default)).Result);
        var details = Assert.IsType<PaymentSummaryResponse>(summary.Value);
        Assert.Equal(350m, details.TotalAmount);
        Assert.Equal(fixture.Account.Id, details.PaymentAccount!.Id);
        Assert.NotNull(details.QrImageDataUrl);
        Assert.Contains("5406350.00", details.QrPayload);

        var response = await controller.CreatePayment(fixture.Request(method), default);
        Assert.IsType<CreatedAtActionResult>(response.Result);
        var payment = Assert.Single(fixture.Db.Payments);
        Assert.Equal(fixture.BarberUser.Id, payment.ReceivedByUserId);
        Assert.Equal(350m, payment.TotalAmount);
        Assert.Equal(method == "Cash" ? (Guid?)null : fixture.Account.Id, payment.PaymentAccountId);
        Assert.Equal(BookingStatus.Completed, fixture.Booking.BookingStatus);
        Assert.Equal(PaymentStatus.Paid, fixture.Booking.PaymentStatus);
        Assert.Equal(fixture.BarberUser.Id, Assert.Single(fixture.Db.QueueEvents).ChangedByUserId);
        Assert.IsType<OkObjectResult>((await controller.GetPayment(payment.Id, default)).Result);
        Assert.IsType<OkObjectResult>((await controller.GetReceipt(payment.Id, default)).Result);
        var receipt = Assert.IsType<OkObjectResult>((await controller.GetBookingReceipt(fixture.Booking.Id, default)).Result);
        Assert.Contains("Walk-in test", System.Text.Json.JsonSerializer.Serialize(receipt.Value));

        var paidSummary = Assert.IsType<OkObjectResult>((await controller.GetBookingPaymentSummary(fixture.Booking.Id, default)).Result);
        Assert.Null(Assert.IsType<PaymentSummaryResponse>(paidSummary.Value).QrImageDataUrl);
        Assert.IsType<ConflictObjectResult>((await controller.CreatePayment(fixture.Request(method), default)).Result);
        Assert.Single(fixture.Db.Payments);
    }

    [Fact]
    public async Task OtherBarberCannotViewCollectOrReadReceipts()
    {
        using var fixture = new Fixture();
        var other = fixture.Controller("Barber", Guid.NewGuid());
        Assert.IsType<ForbidResult>((await other.GetBookingPaymentSummary(fixture.Booking.Id, default)).Result);
        Assert.IsType<ForbidResult>((await other.CreatePayment(fixture.Request("Cash"), default)).Result);
        Assert.Empty(fixture.Db.Payments);

        await fixture.Controller().CreatePayment(fixture.Request("Cash"), default);
        var payment = Assert.Single(fixture.Db.Payments);
        Assert.IsType<ForbidResult>((await other.GetPayment(payment.Id, default)).Result);
        Assert.IsType<ForbidResult>((await other.GetReceipt(payment.Id, default)).Result);
        Assert.IsType<ForbidResult>((await other.GetBookingReceipt(fixture.Booking.Id, default)).Result);
    }

    [Fact]
    public async Task BarberWithoutAssignedProfileCannotCollect()
    {
        using var fixture = new Fixture();
        fixture.Booking.Barber = null;
        fixture.Booking.BarberId = null;
        await fixture.Db.SaveChangesAsync();
        Assert.IsType<ForbidResult>((await fixture.Controller().CreatePayment(fixture.Request("Cash"), default)).Result);
    }

    [Theory]
    [InlineData(BookingStatus.PendingConfirmation)]
    [InlineData(BookingStatus.InService)]
    [InlineData(BookingStatus.Cancelled)]
    public async Task ServiceMustBeCompletedBeforeCheckout(BookingStatus status)
    {
        using var fixture = new Fixture();
        fixture.Booking.BookingStatus = status;
        await fixture.Db.SaveChangesAsync();
        Assert.IsType<BadRequestObjectResult>((await fixture.Controller().GetBookingPaymentSummary(fixture.Booking.Id, default)).Result);
        Assert.IsType<BadRequestObjectResult>((await fixture.Controller().CreatePayment(fixture.Request("Cash"), default)).Result);
        Assert.Empty(fixture.Db.Payments);
    }

    [Fact]
    public async Task MissingPromptPayStillAllowsCash()
    {
        using var fixture = new Fixture();
        fixture.Account.IsActive = false;
        await fixture.Db.SaveChangesAsync();
        var result = Assert.IsType<OkObjectResult>((await fixture.Controller().GetBookingPaymentSummary(fixture.Booking.Id, default)).Result);
        Assert.Null(Assert.IsType<PaymentSummaryResponse>(result.Value).QrImageDataUrl);
        Assert.IsType<BadRequestObjectResult>((await fixture.Controller().CreatePayment(fixture.Request("QrPayment"), default)).Result);
        Assert.IsType<CreatedAtActionResult>((await fixture.Controller().CreatePayment(fixture.Request("Cash"), default)).Result);
    }

    [Fact]
    public async Task InvalidPaymentMethodIsRejected()
    {
        using var fixture = new Fixture();
        Assert.IsType<BadRequestObjectResult>((await fixture.Controller().CreatePayment(fixture.Request("999"), default)).Result);
        Assert.Empty(fixture.Db.Payments);
    }

    [Theory]
    [InlineData("Owner")]
    [InlineData("Admin")]
    [InlineData("FrontDeskStaff")]
    public async Task ExistingStaffCanStillCollect(string role)
    {
        using var fixture = new Fixture();
        Assert.IsType<CreatedAtActionResult>((await fixture.Controller(role, Guid.NewGuid()).CreatePayment(fixture.Request("Cash"), default)).Result);
    }

    [Fact]
    public async Task CustomerCanOnlyReadTheirOwnReceipt()
    {
        using var fixture = new Fixture();
        var customer = new User { Id = Guid.NewGuid(), Role = UserRole.Customer };
        fixture.Db.Users.Add(customer);
        fixture.Booking.Customer = customer;
        fixture.Booking.CustomerId = customer.Id;
        await fixture.Db.SaveChangesAsync();
        await fixture.Controller().CreatePayment(fixture.Request("Cash"), default);
        Assert.IsType<OkObjectResult>((await fixture.Controller("Customer", customer.Id).GetBookingReceipt(fixture.Booking.Id, default)).Result);
        Assert.IsType<ForbidResult>((await fixture.Controller("Customer", Guid.NewGuid()).GetBookingReceipt(fixture.Booking.Id, default)).Result);
    }

    [Fact]
    public async Task DuplicateDatabaseWriteReturnsConflict()
    {
        using var fixture = new Fixture();
        fixture.Db.DuplicateOnSave = true;
        Assert.IsType<ConflictObjectResult>((await fixture.Controller().CreatePayment(fixture.Request("Cash"), default)).Result);
    }

    [Fact]
    public async Task BarberCannotBypassPaymentOrUpdateAnotherBarbersQueue()
    {
        using var fixture = new Fixture();
        var queue = new QueueController(fixture.Db) { ControllerContext = fixture.Controller().ControllerContext };
        Assert.IsType<BadRequestObjectResult>((await queue.UpdateStatus(fixture.Booking.Id, new UpdateQueueStatusRequest("Completed", null), default)).Result);
        queue.ControllerContext = fixture.Controller("Barber", Guid.NewGuid()).ControllerContext;
        Assert.IsType<ForbidResult>((await queue.UpdateStatus(fixture.Booking.Id, new UpdateQueueStatusRequest("InService", null), default)).Result);
        Assert.Equal(BookingStatus.WaitingPayment, fixture.Booking.BookingStatus);
    }

    [Fact]
    public void RoutesAllowBarberCheckoutButNotVoidingPayments()
    {
        foreach (var name in new[] { "GetBookingPaymentSummary", "CreatePayment", "GetPayment", "GetReceipt", "GetBookingReceipt" })
        {
            var roles = ((AuthorizeAttribute)Attribute.GetCustomAttribute(typeof(PaymentsController).GetMethod(name)!, typeof(AuthorizeAttribute))!).Roles!.Split(',');
            Assert.Contains("Barber", roles);
        }
        var voidRoles = ((AuthorizeAttribute)Attribute.GetCustomAttribute(typeof(PaymentsController).GetMethod("VoidPayment")!, typeof(AuthorizeAttribute))!).Roles!.Split(',');
        Assert.DoesNotContain("Barber", voidRoles);
        var correctionRoles = ((AuthorizeAttribute)Attribute.GetCustomAttribute(typeof(PaymentsController).GetMethod("CorrectPayment")!, typeof(AuthorizeAttribute))!).Roles!.Split(',');
        Assert.Equal(new[] { "Barber", "Owner", "Admin" }, correctionRoles);
    }

    [Theory]
    [InlineData("Cash")]
    [InlineData("QrPayment")]
    public async Task CorrectionPreservesOriginalPaymentAndAllowsNewPayment(string method)
    {
        using var fixture = new Fixture();
        var controller = fixture.Controller();
        await controller.CreatePayment(fixture.Request(method), default);
        var original = Assert.Single(fixture.Db.Payments);
        var originalNumber = original.PaymentNumber;
        var originalPaidAt = original.PaidAt;
        var receipt = Assert.IsType<ReceiptResponse>(Assert.IsType<OkObjectResult>((await controller.GetBookingReceipt(fixture.Booking.Id, default)).Result).Value);
        Assert.True(receipt.CanCorrectPayment);
        Assert.IsType<OkObjectResult>((await controller.CorrectPayment(original.Id, new("  Confirmed before receiving money  "), default)).Result);
        Assert.Equal(PaymentStatus.Voided, original.PaymentStatus);
        Assert.Equal(originalNumber, original.PaymentNumber);
        Assert.Equal(originalPaidAt, original.PaidAt);
        Assert.Equal(350m, original.TotalAmount);
        Assert.Equal(fixture.BarberUser.Id, original.ReceivedByUserId);
        Assert.Equal(BookingStatus.WaitingPayment, fixture.Booking.BookingStatus);
        Assert.Equal(PaymentStatus.Unpaid, fixture.Booking.PaymentStatus);
        var audit = Assert.Single(fixture.Db.QueueEvents.Where(e => e.ToStatus == BookingStatus.WaitingPayment));
        Assert.Equal(BookingStatus.Completed, audit.FromStatus);
        Assert.Equal(fixture.BarberUser.Id, audit.ChangedByUserId);
        using var note = System.Text.Json.JsonDocument.Parse(audit.Note!);
        Assert.Equal(original.Id, note.RootElement.GetProperty("paymentId").GetGuid());
        Assert.Equal("Confirmed before receiving money", note.RootElement.GetProperty("reason").GetString());
        Assert.IsType<ConflictObjectResult>((await controller.GetReceipt(original.Id, default)).Result);
        Assert.IsType<NotFoundResult>((await controller.GetBookingReceipt(fixture.Booking.Id, default)).Result);
        var summary = Assert.IsType<PaymentSummaryResponse>(Assert.IsType<OkObjectResult>((await controller.GetBookingPaymentSummary(fixture.Booking.Id, default)).Result).Value);
        Assert.NotNull(summary.QrImageDataUrl);
        Assert.IsType<ConflictObjectResult>((await controller.CorrectPayment(original.Id, new("Repeated correction"), default)).Result);
        Assert.IsType<CreatedAtActionResult>((await controller.CreatePayment(fixture.Request(method), default)).Result);
        Assert.Equal(2, fixture.Db.Payments.Count());
        var replacement = Assert.Single(fixture.Db.Payments.Where(p => p.PaymentStatus == PaymentStatus.Paid));
        Assert.NotEqual(original.Id, replacement.Id);
        var newReceipt = Assert.IsType<ReceiptResponse>(Assert.IsType<OkObjectResult>((await controller.GetBookingReceipt(fixture.Booking.Id, default)).Result).Value);
        Assert.Equal(replacement.Id, newReceipt.PaymentId);
        Assert.IsType<ConflictObjectResult>((await controller.CorrectPayment(original.Id, new("Stale screen retry"), default)).Result);
        Assert.Equal(PaymentStatus.Paid, replacement.PaymentStatus);
        Assert.Equal(BookingStatus.Completed, fixture.Booking.BookingStatus);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("ab")]
    public async Task CorrectionRequiresReason(string reason)
    {
        using var fixture = new Fixture();
        await fixture.Controller().CreatePayment(fixture.Request("Cash"), default);
        var payment = Assert.Single(fixture.Db.Payments);
        Assert.IsType<BadRequestObjectResult>((await fixture.Controller().CorrectPayment(payment.Id, new(reason), default)).Result);
        Assert.IsType<BadRequestObjectResult>((await fixture.Controller().CorrectPayment(payment.Id, new(new string('a', 501)), default)).Result);
        Assert.Equal(PaymentStatus.Paid, payment.PaymentStatus);
        Assert.Single(fixture.Db.QueueEvents);
    }

    [Fact]
    public async Task BarberCannotCorrectOtherBarbersOrStaffPayments()
    {
        using var fixture = new Fixture();
        await fixture.Controller().CreatePayment(fixture.Request("Cash"), default);
        var payment = Assert.Single(fixture.Db.Payments);
        Assert.IsType<ForbidResult>((await fixture.Controller("Barber", Guid.NewGuid()).CorrectPayment(payment.Id, new("Wrong barber"), default)).Result);
        payment.ReceivedByUserId = Guid.NewGuid();
        await fixture.Db.SaveChangesAsync();
        Assert.IsType<ForbidResult>((await fixture.Controller().CorrectPayment(payment.Id, new("Staff received payment"), default)).Result);
        var receipt = Assert.IsType<ReceiptResponse>(Assert.IsType<OkObjectResult>((await fixture.Controller().GetReceipt(payment.Id, default)).Result).Value);
        Assert.False(receipt.CanCorrectPayment);
        Assert.Equal(PaymentStatus.Paid, payment.PaymentStatus);
    }

    [Theory]
    [InlineData("Owner")]
    [InlineData("Admin")]
    public async Task ManagementCanCorrectStaffPayments(string role)
    {
        using var fixture = new Fixture();
        await fixture.Controller("FrontDeskStaff", Guid.NewGuid()).CreatePayment(fixture.Request("Cash"), default);
        var payment = Assert.Single(fixture.Db.Payments);
        var actor = Guid.NewGuid();
        Assert.IsType<OkObjectResult>((await fixture.Controller(role, actor).CorrectPayment(payment.Id, new("Confirmed in error"), default)).Result);
        Assert.Equal(actor, fixture.Db.QueueEvents.Single(e => e.ToStatus == BookingStatus.WaitingPayment).ChangedByUserId);
    }

    [Fact]
    public async Task ConcurrentCorrectionReturnsConflict()
    {
        using var fixture = new Fixture();
        await fixture.Controller().CreatePayment(fixture.Request("Cash"), default);
        var payment = Assert.Single(fixture.Db.Payments);
        fixture.Db.ConcurrencyOnSave = true;
        Assert.IsType<ConflictObjectResult>((await fixture.Controller().CorrectPayment(payment.Id, new("Concurrent request"), default)).Result);
        fixture.Db.ChangeTracker.Clear();
        Assert.Equal(PaymentStatus.Paid, fixture.Db.Payments.Single().PaymentStatus);
        Assert.Single(fixture.Db.QueueEvents);
    }

    [Fact]
    public void DatabaseModelAllowsOnlyOneActivePaymentAndTracksConcurrency()
    {
        using var fixture = new Fixture();
        var payment = fixture.Db.Model.FindEntityType(typeof(Payment))!;
        var index = Assert.Single(payment.GetIndexes(), i => i.Properties.SingleOrDefault()?.Name == nameof(Payment.BookingId));
        Assert.True(index.IsUnique);
        Assert.Equal("payment_status = 'Paid'", index.GetFilter());
        Assert.True(payment.FindProperty(nameof(Payment.PaymentStatus))!.IsConcurrencyToken);
        Assert.True(fixture.Db.Model.FindEntityType(typeof(Booking))!.FindProperty(nameof(Booking.PaymentStatus))!.IsConcurrencyToken);
    }

    private sealed class Fixture : IDisposable
    {
        public TestDbContext Db { get; } = new(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        public User BarberUser { get; } = new() { Id = Guid.NewGuid(), FullName = "Test barber", Role = UserRole.Barber };
        public Booking Booking { get; }
        public PaymentAccount Account { get; } = new() { Id = Guid.NewGuid(), AccountName = "Shop account", AccountType = PaymentAccountType.PromptPayPhone, AccountNumber = "0800000000", IsActive = true, IsDefault = true };

        public Fixture()
        {
            var barber = new BarberProfile { Id = Guid.NewGuid(), UserId = BarberUser.Id, User = BarberUser };
            Booking = new Booking { Id = Guid.NewGuid(), BookingNumber = "TEST-BOOKING", GuestName = "Walk-in test", BarberId = barber.Id, Barber = barber, BookingStatus = BookingStatus.WaitingPayment, SubtotalAmount = 350, TotalAmount = 350 };
            Db.Bookings.Add(Booking);
            Db.PaymentAccounts.Add(Account);
            Db.SaveChanges();
        }

        public CreatePaymentRequest Request(string method) => new(Booking.Id, method == "Cash" ? null : Account.Id, method, "Test");
        public PaymentsController Controller(string role = "Barber", Guid? id = null) => new(Db, new ThaiQrPaymentService())
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, (id ?? BarberUser.Id).ToString()), new Claim(ClaimTypes.Role, role) }, "Test")) } }
        };
        public void Dispose() => Db.Dispose();
    }

    private sealed class TestDbContext(DbContextOptions<ApplicationDbContext> options) : ApplicationDbContext(options)
    {
        public bool DuplicateOnSave { get; set; }
        public bool ConcurrencyOnSave { get; set; }
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) => DuplicateOnSave
            ? throw new DbUpdateException("Duplicate", new PostgresException("Duplicate", "ERROR", "ERROR", PostgresErrorCodes.UniqueViolation))
            : ConcurrencyOnSave ? throw new DbUpdateConcurrencyException("Concurrent write")
            : base.SaveChangesAsync(cancellationToken);
    }
}
