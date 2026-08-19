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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureUsers(modelBuilder);
        ConfigureProfiles(modelBuilder);
        ConfigureServices(modelBuilder);
        ConfigureBookings(modelBuilder);
        ConfigureBookingServices(modelBuilder);
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
}
