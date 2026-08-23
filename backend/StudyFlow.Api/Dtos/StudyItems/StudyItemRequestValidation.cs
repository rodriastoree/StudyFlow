using System.ComponentModel.DataAnnotations;

namespace StudyFlow.Api.Dtos.StudyItems;

internal static class StudyItemRequestValidation
{
    public static IEnumerable<ValidationResult> Validate(
        string type,
        string status,
        DateOnly? dueDate,
        string? examType,
        string? examInstance)
    {
        var hasExamType = !string.IsNullOrWhiteSpace(examType);
        var hasExamInstance = !string.IsNullOrWhiteSpace(examInstance);

        switch (type)
        {
            case "task":
            case "practical-work":
                if (status is not ("pending" or "completed"))
                {
                    yield return new ValidationResult(
                        "Las tareas y trabajos prácticos solo admiten los estados pending o completed.",
                        ["Status"]);
                }

                if (hasExamType || hasExamInstance)
                {
                    yield return new ValidationResult(
                        "Las tareas y trabajos prácticos no admiten datos de examen.",
                        ["ExamType", "ExamInstance"]);
                }

                break;

            case "material":
                if (status is not ("to-summarize" or "summarized" or "printed"))
                {
                    yield return new ValidationResult(
                        "Los materiales solo admiten los estados to-summarize, summarized o printed.",
                        ["Status"]);
                }

                if (dueDate is not null)
                {
                    yield return new ValidationResult(
                        "Los materiales no admiten fecha académica.",
                        ["DueDate"]);
                }

                if (hasExamType || hasExamInstance)
                {
                    yield return new ValidationResult(
                        "Los materiales no admiten datos de examen.",
                        ["ExamType", "ExamInstance"]);
                }

                break;

            case "exam":
                if (status != "pending")
                {
                    yield return new ValidationResult(
                        "Los exámenes utilizan pending como estado técnico.",
                        ["Status"]);
                }

                if (dueDate is null)
                {
                    yield return new ValidationResult(
                        "La fecha es obligatoria para un examen.",
                        ["DueDate"]);
                }

                if (!hasExamType)
                {
                    yield return new ValidationResult(
                        "El tipo de examen es obligatorio.",
                        ["ExamType"]);
                }

                if (!hasExamInstance)
                {
                    yield return new ValidationResult(
                        "La instancia del examen es obligatoria.",
                        ["ExamInstance"]);
                }

                break;
        }
    }
}