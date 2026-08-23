namespace StudyFlow.Api.Models;

public class StudyItem
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string Type { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Subject { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public DateOnly? DueDate { get; set; }

    public string? ExamType { get; set; }

    public string? ExamInstance { get; set; }

    public DateTimeOffset? PrintedAt { get; set; }

    public bool IsArchived { get; set; }

    public DateTimeOffset? ArchivedAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public ApplicationUser User { get; set; } = null!;
}
