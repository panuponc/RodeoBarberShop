namespace RodeoBarberShop.Api.Contracts.Barbers;

public record BarberScheduleResponse(
    Guid BarberId,
    string FullName,
    IReadOnlyList<BarberWorkingHourResponse> WorkingHours);
