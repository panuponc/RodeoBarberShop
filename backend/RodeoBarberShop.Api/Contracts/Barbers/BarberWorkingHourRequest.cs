namespace RodeoBarberShop.Api.Contracts.Barbers;

public record BarberWorkingHourRequest(
    int DayOfWeek,
    TimeOnly StartTime,
    TimeOnly EndTime,
    bool IsWorkingDay);
