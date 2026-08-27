using Microsoft.Extensions.Options;
using StudyFlow.Api.Options;

namespace StudyFlow.Api.Services.Automation;

public sealed class StudyItemAutomationBackgroundService(
    IServiceScopeFactory scopeFactory,
    IOptions<StudyItemAutomationOptions> options,
    ILogger<StudyItemAutomationBackgroundService> logger) : BackgroundService
{
    private readonly TimeSpan _interval = TimeSpan.FromHours(
        options.Value.IntervalHours);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await ProcessSafelyAsync(stoppingToken);

        using var timer = new PeriodicTimer(_interval);

        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await ProcessSafelyAsync(stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal application shutdown.
        }
    }

    private async Task ProcessSafelyAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var processor = scope.ServiceProvider
                .GetRequiredService<IStudyItemAutomationProcessor>();
            var result = await processor.ProcessAsync(cancellationToken);

            logger.LogInformation(
                "StudyItem automation completed. Archived: {ArchivedItems} " +
                "(tasks/practical works: {ArchivedTasksAndPracticalWorks}, " +
                "exams: {ArchivedExams}, materials: {ArchivedMaterials}). " +
                "Deleted: {DeletedItems}.",
                result.ArchivedItems,
                result.ArchivedTasksAndPracticalWorks,
                result.ArchivedExams,
                result.ArchivedMaterials,
                result.DeletedItems);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Normal application shutdown.
        }
        catch (Exception exception)
        {
            logger.LogError(
                exception,
                "StudyItem automation failed. It will be retried at the next interval.");
        }
    }
}