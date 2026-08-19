namespace RodeoBarberShop.Api.Contracts.Barbers;

public record BarberWorkingHourResponse(
    Guid Id,
    int DayOfWeek,
    TimeOnly StartTime,
    TimeOnly EndTime,
    bool IsWorkingDay);
