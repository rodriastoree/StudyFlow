using System.ComponentModel.DataAnnotations;

namespace StudyFlow.Api.Dtos.StudyItems;

public sealed class CreateStudyItemRequest : IValidatableObject
{
    [Required]
    [RegularExpression("^(task|material|practical-work|exam)$")]
    public string Type { get; set; } = string.Empty;

    [StringLength(160)]
    public string? Title { get; set; }

    [Required]
    [StringLength(100)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^(pending|completed|to-summarize|summarized|printed)$")]
    public string Status { get; set; } = string.Empty;

    public DateOnly? DueDate { get; set; }

    [StringLength(20)]
    [RegularExpression("^(partial|final|recovery)$")]
    public string? ExamType { get; set; }

    [StringLength(100)]
    public string? ExamInstance { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        return StudyItemRequestValidation.Validate(
            Type,
            Title,
            Status,
            DueDate,
            ExamType,
            ExamInstance);
    }
}