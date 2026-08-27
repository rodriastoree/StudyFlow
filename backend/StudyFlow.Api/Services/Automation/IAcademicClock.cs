namespace StudyFlow.Api.Services.Automation;

public interface IAcademicClock
{
    AcademicTimeSnapshot GetCurrentTime();
}

public readonly record struct AcademicTimeSnapshot(
    DateTimeOffset UtcNow,
    DateOnly AcademicDate);