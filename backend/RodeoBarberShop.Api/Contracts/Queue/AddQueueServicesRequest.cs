namespace RodeoBarberShop.Api.Contracts.Queue;

public record AddQueueServicesRequest(List<Guid> ServiceIds, DateTimeOffset ExpectedEndAt, decimal ExpectedTotalAmount, decimal ExpectedAddedAmount, int ExpectedAddedMinutes);
