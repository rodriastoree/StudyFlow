using System.ComponentModel.DataAnnotations;

namespace StudyFlow.Api.Dtos.StudyItems;

public sealed class UpdateStudyItemRequest : IValidatableObject
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

    public bool? IsArchived { get; set; }

    public bool? ArchivedManually { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        foreach (var result in StudyItemRequestValidation.Validate(
                     Type,
                     Title,
                     Status,
                     DueDate,
                     ExamType,
                     ExamInstance))
        {
            yield return result;
        }

        if (IsArchived.HasValue
            && ArchivedManually.HasValue
            && IsArchived.Value != ArchivedManually.Value)
        {
            yield return new ValidationResult(
                "IsArchived y ArchivedManually no pueden contener valores diferentes.",
                [nameof(IsArchived), nameof(ArchivedManually)]);
        }
    }
}