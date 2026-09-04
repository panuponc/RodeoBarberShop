using Microsoft.EntityFrameworkCore;
using RodeoBarberShop.Api.Entities;

namespace RodeoBarberShop.Api.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<CustomerProfile> CustomerProfiles => Set<CustomerProfile>();
    public DbSet<BarberProfile> BarberProfiles => Set<BarberProfile>();
    public DbSet<Service> Services => Set<Service>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<BookingService> BookingServices => Set<BookingService>();
    public DbSet<ShopSetting> ShopSettings => Set<ShopSetting>();
    public DbSet<ShopHoliday> ShopHolidays => Set<ShopHoliday>();
    public DbSet<BarberService> BarberServices => Set<BarberService>();
    public DbSet<BarberWorkingHour> BarberWorkingHours => Set<BarberWorkingHour>();
    public DbSet<Chair> Chairs => Set<Chair>();
    public DbSet<BarberChairAssignment> BarberChairAssignments => Set<BarberChairAssignment>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<PaymentAccount> PaymentAccounts => Set<PaymentAccount>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Promotion> Promotions => Set<Promotion>();
    public DbSet<PromotionService> PromotionServices => Set<PromotionService>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<QueueEvent> QueueEvents => Set<QueueEvent>();
    public DbSet<BarberAssignmentEvent> BarberAssignmentEvents => Set<BarberAssignmentEvent>();
    public DbSet<EmailOtp> EmailOtps => Set<EmailOtp>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureUsers(modelBuilder);
        ConfigureProfiles(modelBuilder);
        ConfigureServices(modelBuilder);
        ConfigureBookings(modelBuilder);
        ConfigureBookingServices(modelBuilder);
        ConfigureShop(modelBuilder);
        ConfigureBarberSchedules(modelBuilder);
        ConfigurePaymentAccounts(modelBuilder);
        ConfigurePayments(modelBuilder);
        ConfigurePromotions(modelBuilder);
        ConfigureNotifications(modelBuilder);
        ConfigureEvents(modelBuilder);
        ConfigureEmailOtps(modelBuilder);
    }

    private static void ConfigureUsers(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(user => user.Id);

            entity.Property(user => user.FullName).HasColumnName("full_name").HasMaxLength(150).IsRequired();
            entity.Property(user => user.Nickname).HasColumnName("nickname").HasMaxLength(100);
            entity.Property(user => user.PhoneNumber).HasColumnName("phone_number").HasMaxLength(30).IsRequired();
            entity.Property(user => user.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(user => user.PasswordHash).HasColumnName("password_hash").IsRequired();
            entity.Property(user => user.Role).HasColumnName("role").HasMaxLength(30).HasConversion<string>().IsRequired();
            entity.Property(user => user.AccountStatus).HasColumnName("account_status").HasMaxLength(30).HasConversion<string>().IsRequired();
            entity.Property(user => user.ProfileImageUrl).HasColumnName("profile_image_url");
            entity.Property(user => user.StartDate).HasColumnName("start_date");
            entity.Property(user => user.Note).HasColumnName("note");
            entity.Property(user => user.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(user => user.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasIndex(user => user.Email).IsUnique();
            entity.HasIndex(user => user.PhoneNumber);
            entity.HasIndex(user => new { user.Role, user.AccountStatus });
        });
    }

    private static void ConfigureProfiles(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CustomerProfile>(entity =>
        {
            entity.ToTable("customer_profiles");
            entity.HasKey(profile => profile.Id);

            entity.Property(profile => profile.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(profile => profile.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(profile => profile.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasOne(profile => profile.User)
                .WithOne(user => user.CustomerProfile)
                .HasForeignKey<CustomerProfile>(profile => profile.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BarberProfile>(entity =>
        {
            entity.ToTable("barber_profiles");
            entity.HasKey(profile => profile.Id);

            entity.Property(profile => profile.UserId).HasColumnName("user_id").IsRequired();
            entity.Property(profile => profile.Specialty).HasColumnName("specialty");
            entity.Property(profile => profile.ExperienceYears).HasColumnName("experience_years");
            entity.Property(profile => profile.StandbyPriority).HasColumnName("standby_priority");
            entity.Property(profile => profile.Bio).HasColumnName("bio");
            entity.Property(profile => profile.IsAvailable).HasColumnName("is_available").IsRequired();
            entity.Property(profile => profile.AcceptsBooking).HasColumnName("accepts_booking").IsRequired();
            entity.Property(profile => profile.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(profile => profile.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasOne(profile => profile.User)
                .WithOne(user => user.BarberProfile)
                .HasForeignKey<BarberProfile>(profile => profile.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureServices(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Service>(entity =>
        {
            entity.ToTable("services");
            entity.HasKey(service => service.Id);

            entity.Property(service => service.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(service => service.Description).HasColumnName("description");
            entity.Property(service => service.Price).HasColumnName("price").HasPrecision(10, 2).IsRequired();
            entity.Property(service => service.DurationMinutes).HasColumnName("duration_minutes").IsRequired();
            entity.Property(service => service.IsActive).HasColumnName("is_active").IsRequired();
            entity.Property(service => service.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(service => service.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasIndex(service => service.IsActive);
        });
    }

    private static void ConfigureBookings(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.ToTable("bookings");
            entity.HasKey(booking => booking.Id);

            entity.Property(booking => booking.BookingNumber).HasColumnName("booking_number").HasMaxLength(30).IsRequired();
            entity.Property(booking => booking.BookingSource).HasColumnName("booking_source").HasMaxLength(30).HasConversion<string>().IsRequired();
            entity.Property(booking => booking.CustomerId).HasColumnName("customer_id");
            entity.Property(booking => booking.GuestName).HasColumnName("guest_name").HasMaxLength(150);
            entity.Property(booking => booking.GuestPhoneNumber).HasColumnName("guest_phone_number").HasMaxLength(30);
            entity.Property(booking => booking.GuestEmail).HasColumnName("guest_email").HasMaxLength(255);
            entity.Property(booking => booking.BarberId).HasColumnName("barber_id");
            entity.Property(booking => booking.StartAt).HasColumnName("start_at").IsRequired();
            entity.Property(booking => booking.EndAt).HasColumnName("end_at").IsRequired();
            entity.Property(booking => booking.EstimatedDurationMinutes).HasColumnName("estimated_duration_minutes").IsRequired();
            entity.Property(booking => booking.SubtotalAmount).HasColumnName("subtotal_amount").HasPrecision(10, 2).IsRequired();
            entity.Property(booking => booking.DiscountAmount).HasColumnName("discount_amount").HasPrecision(10, 2).IsRequired();
            entity.Property(booking => booking.TotalAmount).HasColumnName("total_amount").HasPrecision(10, 2).IsRequired();
            entity.Property(booking => booking.BookingStatus).HasColumnName("booking_status").HasMaxLength(30).HasConversion<string>().IsRequired();
            entity.Property(booking => booking.PaymentStatus).HasColumnName("payment_status").HasMaxLength(30).HasConversion<string>().IsRequired();
            entity.Property(booking => booking.CustomerNote).HasColumnName("customer_note");
            entity.Property(booking => booking.CancelReason).HasColumnName("cancel_reason");
            entity.Property(booking => booking.CancelledAt).HasColumnName("cancelled_at");
            entity.Property(booking => booking.CheckedInAt).HasColumnName("checked_in_at");
            entity.Property(booking => booking.ServiceStartedAt).HasColumnName("service_started_at");
            entity.Property(booking => booking.ServiceCompletedAt).HasColumnName("service_completed_at");
            entity.Property(booking => booking.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(booking => booking.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(booking => booking.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasIndex(booking => booking.BookingNumber).IsUnique();
            entity.HasIndex(booking => booking.StartAt);
            entity.HasIndex(booking => new { booking.CustomerId, booking.StartAt });
            entity.HasIndex(booking => new { booking.BarberId, booking.StartAt, booking.EndAt });
            entity.HasIndex(booking => booking.BookingStatus);

            entity.HasOne(booking => booking.Customer)
                .WithMany(user => user.CustomerBookings)
                .HasForeignKey(booking => booking.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(booking => booking.Barber)
                .WithMany(barber => barber.Bookings)
                .HasForeignKey(booking => booking.BarberId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(booking => booking.CreatedByUser)
                .WithMany(user => user.CreatedBookings)
                .HasForeignKey(booking => booking.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureBookingServices(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BookingService>(entity =>
        {
            entity.ToTable("booking_services");
            entity.HasKey(bookingService => bookingService.Id);

            entity.Property(bookingService => bookingService.BookingId).HasColumnName("booking_id").IsRequired();
            entity.Property(bookingService => bookingService.ServiceId).HasColumnName("service_id").IsRequired();
            entity.Property(bookingService => bookingService.ServiceName).HasColumnName("service_name").HasMaxLength(150).IsRequired();
            entity.Property(bookingService => bookingService.UnitPrice).HasColumnName("unit_price").HasPrecision(10, 2).IsRequired();
            entity.Property(bookingService => bookingService.DurationMinutes).HasColumnName("duration_minutes").IsRequired();
            entity.Property(bookingService => bookingService.Quantity).HasColumnName("quantity").IsRequired();
            entity.Property(bookingService => bookingService.LineTotal).HasColumnName("line_total").HasPrecision(10, 2).IsRequired();
            entity.Property(bookingService => bookingService.AddedDuringService).HasColumnName("added_during_service").IsRequired();
            entity.Property(bookingService => bookingService.AddedByUserId).HasColumnName("added_by_user_id");
            entity.Property(bookingService => bookingService.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasIndex(bookingService => bookingService.BookingId);

            entity.HasOne(bookingService => bookingService.Booking)
                .WithMany(booking => booking.BookingServices)
                .HasForeignKey(bookingService => bookingService.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(bookingService => bookingService.Service)
                .WithMany(service => service.BookingServices)
                .HasForeignKey(bookingService => bookingService.ServiceId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(bookingService => bookingService.AddedByUser)
                .WithMany()
                .HasForeignKey(bookingService => bookingService.AddedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureShop(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ShopSetting>(entity =>
        {
            entity.ToTable("shop_settings");
            entity.HasKey(setting => setting.Id);

            entity.Property(setting => setting.ShopName).HasColumnName("shop_name").HasMaxLength(150).IsRequired();
            entity.Property(setting => setting.Address).HasColumnName("address");
            entity.Property(setting => setting.PhoneNumber).HasColumnName("phone_number").HasMaxLength(30);
            entity.Property(setting => setting.FacebookUrl).HasColumnName("facebook_url");
            entity.Property(setting => setting.InstagramUrl).HasColumnName("instagram_url");
            entity.Property(setting => setting.LineOfficial).HasColumnName("line_official").HasMaxLength(100);
            entity.Property(setting => setting.WebsiteUrl).HasColumnName("website_url");
            entity.Property(setting => setting.LogoUrl).HasColumnName("logo_url");
            entity.Property(setting => setting.OpeningTime).HasColumnName("opening_time").IsRequired();
            entity.Property(setting => setting.ClosingTime).HasColumnName("closing_time").IsRequired();
            entity.Property(setting => setting.BookingAdvanceDays).HasColumnName("booking_advance_days").IsRequired();
            entity.Property(setting => setting.CancellationDeadlineHours).HasColumnName("cancellation_deadline_hours").IsRequired();
            entity.Property(setting => setting.SlotIntervalMinutes).HasColumnName("slot_interval_minutes").IsRequired();
            entity.Property(setting => setting.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(setting => setting.UpdatedAt).HasColumnName("updated_at").IsRequired();
        });

        modelBuilder.Entity<ShopHoliday>(entity =>
        {
            entity.ToTable("shop_holidays");
            entity.HasKey(holiday => holiday.Id);

            entity.Property(holiday => holiday.HolidayType).HasColumnName("holiday_type").HasMaxLength(30).HasConversion<string>().IsRequired();
            entity.Property(holiday => holiday.DayOfWeek).HasColumnName("day_of_week");
            entity.Property(holiday => holiday.HolidayDate).HasColumnName("holiday_date");
            entity.Property(holiday => holiday.Reason).HasColumnName("reason");
            entity.Property(holiday => holiday.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(holiday => holiday.UpdatedAt).HasColumnName("updated_at").IsRequired();
        });
    }

    private static void ConfigureBarberSchedules(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BarberService>(entity =>
        {
            entity.ToTable("barber_services");
            entity.HasKey(barberService => barberService.Id);

            entity.Property(barberService => barberService.BarberId).HasColumnName("barber_id").IsRequired();
            entity.Property(barberService => barberService.ServiceId).HasColumnName("service_id").IsRequired();
            entity.Property(barberService => barberService.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasIndex(barberService => new { barberService.BarberId, barberService.ServiceId }).IsUnique();

            entity.HasOne(barberService => barberService.Barber)
                .WithMany(barber => barber.BarberServices)
                .HasForeignKey(barberService => barberService.BarberId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(barberService => barberService.Service)
                .WithMany(service => service.BarberServices)
                .HasForeignKey(barberService => barberService.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BarberWorkingHour>(entity =>
        {
            entity.ToTable("barber_working_hours");
            entity.HasKey(workingHour => workingHour.Id);

            entity.Property(workingHour => workingHour.BarberId).HasColumnName("barber_id").IsRequired();
            entity.Property(workingHour => workingHour.DayOfWeek).HasColumnName("day_of_week").IsRequired();
            entity.Property(workingHour => workingHour.StartTime).HasColumnName("start_time").IsRequired();
            entity.Property(workingHour => workingHour.EndTime).HasColumnName("end_time").IsRequired();
            entity.Property(workingHour => workingHour.IsWorkingDay).HasColumnName("is_working_day").IsRequired();
            entity.Property(workingHour => workingHour.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(workingHour => workingHour.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasIndex(workingHour => new { workingHour.BarberId, workingHour.DayOfWeek });

            entity.HasOne(workingHour => workingHour.Barber)
                .WithMany(barber => barber.WorkingHours)
                .HasForeignKey(workingHour => workingHour.BarberId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Chair>(entity =>
        {
            entity.ToTable("chairs");
            entity.HasKey(chair => chair.Id);

            entity.Property(chair => chair.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
            entity.Property(chair => chair.Note).HasColumnName("note").HasMaxLength(255);
            entity.Property(chair => chair.SortOrder).HasColumnName("sort_order").IsRequired();
            entity.Property(chair => chair.IsActive).HasColumnName("is_active").IsRequired();
            entity.Property(chair => chair.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(chair => chair.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasIndex(chair => chair.SortOrder);
            entity.HasIndex(chair => chair.Name).IsUnique();
        });

        modelBuilder.Entity<BarberChairAssignment>(entity =>
        {
            entity.ToTable("barber_chair_assignments");
            entity.HasKey(assignment => assignment.Id);

            entity.Property(assignment => assignment.ChairId).HasColumnName("chair_id").IsRequired();
            entity.Property(assignment => assignment.BarberId).HasColumnName("barber_id").IsRequired();
            entity.Property(assignment => assignment.StartDate).HasColumnName("start_date").IsRequired();
            entity.Property(assignment => assignment.EndDate).HasColumnName("end_date");
            entity.Property(assignment => assignment.IsPrimary).HasColumnName("is_primary").IsRequired();
            entity.Property(assignment => assignment.Note).HasColumnName("note").HasMaxLength(255);
            entity.Property(assignment => assignment.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(assignment => assignment.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasIndex(assignment => new { assignment.ChairId, assignment.StartDate, assignment.EndDate });
            entity.HasIndex(assignment => new { assignment.BarberId, assignment.StartDate, assignment.EndDate });

            entity.HasOne(assignment => assignment.Chair)
                .WithMany(chair => chair.Assignments)
                .HasForeignKey(assignment => assignment.ChairId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(assignment => assignment.Barber)
                .WithMany(barber => barber.ChairAssignments)
                .HasForeignKey(assignment => assignment.BarberId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LeaveRequest>(entity =>
        {
            entity.ToTable("leave_requests");
            entity.HasKey(leaveRequest => leaveRequest.Id);

            entity.Property(leaveRequest => leaveRequest.BarberId).HasColumnName("barber_id").IsRequired();
            entity.Property(leaveRequest => leaveRequest.LeaveType).HasColumnName("leave_type").HasMaxLength(50).IsRequired();
            entity.Property(leaveRequest => leaveRequest.StartAt).HasColumnName("start_at").IsRequired();
            entity.Property(leaveRequest => leaveRequest.EndAt).HasColumnName("end_at").IsRequired();
            entity.Property(leaveRequest => leaveRequest.Reason).HasColumnName("reason").IsRequired();
            entity.Property(leaveRequest => leaveRequest.Status).HasColumnName("status").HasMaxLength(30).HasConversion<string>().IsRequired();
            entity.Property(leaveRequest => leaveRequest.ReviewedByUserId).HasColumnName("reviewed_by_user_id");
            entity.Property(leaveRequest => leaveRequest.ReviewedAt).HasColumnName("reviewed_at");
            entity.Property(leaveRequest => leaveRequest.ReviewNote).HasColumnName("review_note");
            entity.Property(leaveRequest => leaveRequest.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(leaveRequest => leaveRequest.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasIndex(leaveRequest => new { leaveRequest.BarberId, leaveRequest.StartAt, leaveRequest.EndAt });

            entity.HasOne(leaveRequest => leaveRequest.Barber)
                .WithMany(barber => barber.LeaveRequests)
                .HasForeignKey(leaveRequest => leaveRequest.BarberId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(leaveRequest => leaveRequest.ReviewedByUser)
                .WithMany(user => user.ReviewedLeaveRequests)
                .HasForeignKey(leaveRequest => leaveRequest.ReviewedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigurePayments(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.HasKey(payment => payment.Id);

            entity.Property(payment => payment.BookingId).HasColumnName("booking_id").IsRequired();
            entity.Property(payment => payment.PaymentAccountId).HasColumnName("payment_account_id");
            entity.Property(payment => payment.PaymentNumber).HasColumnName("payment_number").HasMaxLength(30).IsRequired();
            entity.Property(payment => payment.PaymentMethod).HasColumnName("payment_method").HasMaxLength(30).HasConversion<string>().IsRequired();
            entity.Property(payment => payment.PaymentStatus).HasColumnName("payment_status").HasMaxLength(30).HasConversion<string>().IsRequired();
            entity.Property(payment => payment.SubtotalAmount).HasColumnName("subtotal_amount").HasPrecision(10, 2).IsRequired();
            entity.Property(payment => payment.DiscountAmount).HasColumnName("discount_amount").HasPrecision(10, 2).IsRequired();
            entity.Property(payment => payment.TotalAmount).HasColumnName("total_amount").HasPrecision(10, 2).IsRequired();
            entity.Property(payment => payment.PaidAt).HasColumnName("paid_at").IsRequired();
            entity.Property(payment => payment.ReceivedByUserId).HasColumnName("received_by_user_id").IsRequired();
            entity.Property(payment => payment.Note).HasColumnName("note");
            entity.Property(payment => payment.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(payment => payment.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasIndex(payment => payment.BookingId).IsUnique();
            entity.HasIndex(payment => payment.PaymentNumber).IsUnique();
            entity.HasIndex(payment => payment.PaymentAccountId);

            entity.HasOne(payment => payment.Booking)
                .WithOne(booking => booking.Payment)
                .HasForeignKey<Payment>(payment => payment.BookingId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(payment => payment.PaymentAccount)
                .WithMany(paymentAccount => paymentAccount.Payments)
                .HasForeignKey(payment => payment.PaymentAccountId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(payment => payment.ReceivedByUser)
                .WithMany(user => user.ReceivedPayments)
                .HasForeignKey(payment => payment.ReceivedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigurePaymentAccounts(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<PaymentAccount>(entity =>
        {
            entity.ToTable("payment_accounts");
            entity.HasKey(paymentAccount => paymentAccount.Id);

            entity.Property(paymentAccount => paymentAccount.AccountName).HasColumnName("account_name").HasMaxLength(150).IsRequired();
            entity.Property(paymentAccount => paymentAccount.AccountType).HasColumnName("account_type").HasMaxLength(40).HasConversion<string>().IsRequired();
            entity.Property(paymentAccount => paymentAccount.AccountNumber).HasColumnName("account_number").HasMaxLength(50).IsRequired();
            entity.Property(paymentAccount => paymentAccount.BankName).HasColumnName("bank_name").HasMaxLength(100);
            entity.Property(paymentAccount => paymentAccount.IsActive).HasColumnName("is_active").IsRequired();
            entity.Property(paymentAccount => paymentAccount.IsDefault).HasColumnName("is_default").IsRequired();
            entity.Property(paymentAccount => paymentAccount.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(paymentAccount => paymentAccount.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasIndex(paymentAccount => new { paymentAccount.IsActive, paymentAccount.IsDefault });
        });
    }

    private static void ConfigurePromotions(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Promotion>(entity =>
        {
            entity.ToTable("promotions");
            entity.HasKey(promotion => promotion.Id);

            entity.Property(promotion => promotion.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(promotion => promotion.Description).HasColumnName("description");
            entity.Property(promotion => promotion.StartDate).HasColumnName("start_date").IsRequired();
            entity.Property(promotion => promotion.EndDate).HasColumnName("end_date").IsRequired();
            entity.Property(promotion => promotion.DiscountType).HasColumnName("discount_type").HasMaxLength(30).HasConversion<string>().IsRequired();
            entity.Property(promotion => promotion.DiscountValue).HasColumnName("discount_value").HasPrecision(10, 2).IsRequired();
            entity.Property(promotion => promotion.IsActive).HasColumnName("is_active").IsRequired();
            entity.Property(promotion => promotion.CreatedAt).HasColumnName("created_at").IsRequired();
            entity.Property(promotion => promotion.UpdatedAt).HasColumnName("updated_at").IsRequired();

            entity.HasIndex(promotion => new { promotion.StartDate, promotion.EndDate, promotion.IsActive });
        });

        modelBuilder.Entity<PromotionService>(entity =>
        {
            entity.ToTable("promotion_services");
            entity.HasKey(promotionService => promotionService.Id);

            entity.Property(promotionService => promotionService.PromotionId).HasColumnName("promotion_id").IsRequired();
            entity.Property(promotionService => promotionService.ServiceId).HasColumnName("service_id").IsRequired();
            entity.Property(promotionService => promotionService.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasIndex(promotionService => new { promotionService.PromotionId, promotionService.ServiceId }).IsUnique();

            entity.HasOne(promotionService => promotionService.Promotion)
                .WithMany(promotion => promotion.PromotionServices)
                .HasForeignKey(promotionService => promotionService.PromotionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(promotionService => promotionService.Service)
                .WithMany(service => service.PromotionServices)
                .HasForeignKey(promotionService => promotionService.ServiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureNotifications(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("notifications");
            entity.HasKey(notification => notification.Id);

            entity.Property(notification => notification.RecipientUserId).HasColumnName("recipient_user_id");
            entity.Property(notification => notification.RecipientRole).HasColumnName("recipient_role").HasMaxLength(30).HasConversion<string>();
            entity.Property(notification => notification.Title).HasColumnName("title").HasMaxLength(150).IsRequired();
            entity.Property(notification => notification.Message).HasColumnName("message").IsRequired();
            entity.Property(notification => notification.NotificationType).HasColumnName("notification_type").HasMaxLength(50).HasConversion<string>().IsRequired();
            entity.Property(notification => notification.RelatedBookingId).HasColumnName("related_booking_id");
            entity.Property(notification => notification.IsRead).HasColumnName("is_read").IsRequired();
            entity.Property(notification => notification.ReadAt).HasColumnName("read_at");
            entity.Property(notification => notification.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasIndex(notification => new { notification.RecipientUserId, notification.IsRead });

            entity.HasOne(notification => notification.RecipientUser)
                .WithMany(user => user.Notifications)
                .HasForeignKey(notification => notification.RecipientUserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(notification => notification.RelatedBooking)
                .WithMany(booking => booking.Notifications)
                .HasForeignKey(notification => notification.RelatedBookingId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigureEvents(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<QueueEvent>(entity =>
        {
            entity.ToTable("queue_events");
            entity.HasKey(queueEvent => queueEvent.Id);

            entity.Property(queueEvent => queueEvent.BookingId).HasColumnName("booking_id").IsRequired();
            entity.Property(queueEvent => queueEvent.FromStatus).HasColumnName("from_status").HasMaxLength(30).HasConversion<string>();
            entity.Property(queueEvent => queueEvent.ToStatus).HasColumnName("to_status").HasMaxLength(30).HasConversion<string>().IsRequired();
            entity.Property(queueEvent => queueEvent.ChangedByUserId).HasColumnName("changed_by_user_id");
            entity.Property(queueEvent => queueEvent.Note).HasColumnName("note");
            entity.Property(queueEvent => queueEvent.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasIndex(queueEvent => new { queueEvent.BookingId, queueEvent.CreatedAt });

            entity.HasOne(queueEvent => queueEvent.Booking)
                .WithMany(booking => booking.QueueEvents)
                .HasForeignKey(queueEvent => queueEvent.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(queueEvent => queueEvent.ChangedByUser)
                .WithMany(user => user.QueueEvents)
                .HasForeignKey(queueEvent => queueEvent.ChangedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BarberAssignmentEvent>(entity =>
        {
            entity.ToTable("barber_assignment_events");
            entity.HasKey(assignmentEvent => assignmentEvent.Id);

            entity.Property(assignmentEvent => assignmentEvent.BookingId).HasColumnName("booking_id").IsRequired();
            entity.Property(assignmentEvent => assignmentEvent.FromBarberId).HasColumnName("from_barber_id");
            entity.Property(assignmentEvent => assignmentEvent.ToBarberId).HasColumnName("to_barber_id");
            entity.Property(assignmentEvent => assignmentEvent.ChangedByUserId).HasColumnName("changed_by_user_id").IsRequired();
            entity.Property(assignmentEvent => assignmentEvent.Reason).HasColumnName("reason");
            entity.Property(assignmentEvent => assignmentEvent.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasIndex(assignmentEvent => assignmentEvent.BookingId);

            entity.HasOne(assignmentEvent => assignmentEvent.Booking)
                .WithMany(booking => booking.BarberAssignmentEvents)
                .HasForeignKey(assignmentEvent => assignmentEvent.BookingId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(assignmentEvent => assignmentEvent.FromBarber)
                .WithMany()
                .HasForeignKey(assignmentEvent => assignmentEvent.FromBarberId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(assignmentEvent => assignmentEvent.ToBarber)
                .WithMany()
                .HasForeignKey(assignmentEvent => assignmentEvent.ToBarberId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(assignmentEvent => assignmentEvent.ChangedByUser)
                .WithMany(user => user.BarberAssignmentEvents)
                .HasForeignKey(assignmentEvent => assignmentEvent.ChangedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureEmailOtps(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EmailOtp>(entity =>
        {
            entity.ToTable("email_otps");
            entity.HasKey(emailOtp => emailOtp.Id);

            entity.Property(emailOtp => emailOtp.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(emailOtp => emailOtp.OtpHash).HasColumnName("otp_hash").IsRequired();
            entity.Property(emailOtp => emailOtp.Purpose).HasColumnName("purpose").HasMaxLength(50).IsRequired();
            entity.Property(emailOtp => emailOtp.ExpiresAt).HasColumnName("expires_at").IsRequired();
            entity.Property(emailOtp => emailOtp.VerifiedAt).HasColumnName("verified_at");
            entity.Property(emailOtp => emailOtp.CreatedAt).HasColumnName("created_at").IsRequired();

            entity.HasIndex(emailOtp => new { emailOtp.Email, emailOtp.Purpose, emailOtp.ExpiresAt });
        });
    }
}
