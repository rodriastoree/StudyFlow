using Microsoft.EntityFrameworkCore;
using StudyFlow.Api.Data;

namespace StudyFlow.Api.Services.Automation;

public sealed class StudyItemAutomationProcessor(
    ApplicationDbContext dbContext,
    IAcademicClock academicClock) : IStudyItemAutomationProcessor
{
    private static readonly TimeSpan PrintedMaterialArchiveAge = TimeSpan.FromDays(5);
    private static readonly TimeSpan ArchivedItemRetention = TimeSpan.FromDays(7);

    public async Task<StudyItemAutomationResult> ProcessAsync(
        CancellationToken cancellationToken)
    {
        var currentTime = academicClock.GetCurrentTime();
        var printedCutoff = currentTime.UtcNow - PrintedMaterialArchiveAge;

        var itemsToArchive = await dbContext.StudyItems
            .Where(item => !item.IsArchived
                && (((item.Type == "task" || item.Type == "practical-work")
                        && item.DueDate.HasValue
                        && item.DueDate.Value < currentTime.AcademicDate)
                    || (item.Type == "exam"
                        && item.DueDate.HasValue
                        && item.DueDate.Value < currentTime.AcademicDate)
                    || (item.Type == "material"
                        && item.Status == "printed"
                        && item.PrintedAt.HasValue
                        && item.PrintedAt.Value <= printedCutoff)))
            .ToListAsync(cancellationToken);

        var archivedTasksAndPracticalWorks = 0;
        var archivedExams = 0;
        var archivedMaterials = 0;

        foreach (var item in itemsToArchive)
        {
            item.IsArchived = true;
            item.ArchivedAt = currentTime.UtcNow;
            item.UpdatedAt = currentTime.UtcNow;

            switch (item.Type)
            {
                case "task":
                case "practical-work":
                    archivedTasksAndPracticalWorks++;
                    break;
                case "exam":
                    archivedExams++;
                    break;
                case "material":
                    archivedMaterials++;
                    break;
            }
        }

        if (itemsToArchive.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var newlyArchivedIds = itemsToArchive
            .Select(item => item.Id)
            .ToArray();
        var deletionCutoff = currentTime.UtcNow - ArchivedItemRetention;
        var deletionQuery = dbContext.StudyItems
            .Where(item => item.IsArchived
                && item.ArchivedAt.HasValue
                && item.ArchivedAt.Value <= deletionCutoff);

        if (newlyArchivedIds.Length > 0)
        {
            deletionQuery = deletionQuery
                .Where(item => !newlyArchivedIds.Contains(item.Id));
        }

        var itemsToDelete = await deletionQuery
            .ToListAsync(cancellationToken);

        if (itemsToDelete.Count > 0)
        {
            dbContext.StudyItems.RemoveRange(itemsToDelete);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return new StudyItemAutomationResult(
            archivedTasksAndPracticalWorks,
            archivedExams,
            archivedMaterials,
            itemsToDelete.Count);
    }
}