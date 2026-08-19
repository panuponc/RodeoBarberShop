namespace RodeoBarberShop.Api.Contracts.Queue;

public record QueueEventResponse(
    Guid Id,
    Guid BookingId,
    string? FromStatus,
    string ToStatus,
    Guid? ChangedByUserId,
    string? Note,
    DateTimeOffset CreatedAt);
