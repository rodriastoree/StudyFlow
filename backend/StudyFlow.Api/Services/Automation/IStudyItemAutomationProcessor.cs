namespace StudyFlow.Api.Services.Automation;

public interface IStudyItemAutomationProcessor
{
    Task<StudyItemAutomationResult> ProcessAsync(
        CancellationToken cancellationToken);
}

public readonly record struct StudyItemAutomationResult(
    int ArchivedTasksAndPracticalWorks,
    int ArchivedExams,
    int ArchivedMaterials,
    int DeletedItems)
{
    public int ArchivedItems =>
        ArchivedTasksAndPracticalWorks + ArchivedExams + ArchivedMaterials;
}