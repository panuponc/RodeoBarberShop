namespace RodeoBarberShop.Api.Contracts.Barbers;

public record UpdateBarberServicesRequest(IReadOnlyList<Guid> ServiceIds);
