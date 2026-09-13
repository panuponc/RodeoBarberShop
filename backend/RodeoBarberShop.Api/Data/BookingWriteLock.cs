using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace RodeoBarberShop.Api.Data;

public static class BookingWriteLock
{
    // Validate availability and persist under the same lock, including new bookings.
    public static async Task<IDbContextTransaction?> BeginAsync(ApplicationDbContext db, CancellationToken cancellationToken)
    {
        if (!db.Database.IsRelational()) return null;
        var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            await db.Database.ExecuteSqlRawAsync("LOCK TABLE bookings IN SHARE ROW EXCLUSIVE MODE", cancellationToken);
            return transaction;
        }
        catch
        {
            await transaction.DisposeAsync();
            throw;
        }
    }
}
