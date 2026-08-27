using Microsoft.Extensions.Options;
using StudyFlow.Api.Options;

namespace StudyFlow.Api.Services.Automation;

public sealed class AcademicClock : IAcademicClock
{
    private readonly TimeProvider _timeProvider;
    private readonly TimeZoneInfo _academicTimeZone;

    public AcademicClock(
        TimeProvider timeProvider,
        IOptions<StudyItemAutomationOptions> options)
    {
        _timeProvider = timeProvider;
        _academicTimeZone = TimeZoneInfo.FindSystemTimeZoneById(
            options.Value.AcademicTimeZoneId);
    }

    public AcademicTimeSnapshot GetCurrentTime()
    {
        var utcNow = _timeProvider.GetUtcNow();
        var academicLocalTime = TimeZoneInfo.ConvertTime(utcNow, _academicTimeZone);

        return new AcademicTimeSnapshot(
            utcNow,
            DateOnly.FromDateTime(academicLocalTime.DateTime));
    }
}