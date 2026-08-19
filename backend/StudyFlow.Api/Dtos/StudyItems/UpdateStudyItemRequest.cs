using System.ComponentModel.DataAnnotations;

namespace StudyFlow.Api.Dtos.StudyItems;

public sealed class UpdateStudyItemRequest
{
    [Required]
    [RegularExpression("^(task|material)$")]
    public string Type { get; set; } = string.Empty;

    [Required]
    [StringLength(160)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(pending|completed|to-summarize|summarized|printed)$")]
    public string Status { get; set; } = string.Empty;

    public DateTimeOffset? PrintedAt { get; set; }

    public bool ArchivedManually { get; set; }
}
