namespace StudyFlow.Api.Options;

public sealed class StudyFlowAppOptions
{
    public const string SectionName = "App";

    public string FrontendBaseUrl { get; init; } = string.Empty;
}
