namespace StudyFlow.Api.Options;

public sealed class StudyItemAutomationOptions
{
    public const string SectionName = "StudyItemAutomation";

    public string AcademicTimeZoneId { get; set; } = "America/Argentina/Buenos_Aires";

    public int IntervalHours { get; set; } = 6;
}