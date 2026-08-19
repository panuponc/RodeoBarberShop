namespace RodeoBarberShop.Api.Contracts.Queue;

public record UpdateQueueStatusRequest(
    string Status,
    string? Note);
