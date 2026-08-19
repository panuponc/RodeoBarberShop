namespace RodeoBarberShop.Api.Contracts.Barbers;

public record UpdateBarberWorkingHoursRequest(
    IReadOnlyList<BarberWorkingHourRequest> WorkingHours);
