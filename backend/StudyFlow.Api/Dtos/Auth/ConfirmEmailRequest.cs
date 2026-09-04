using System.ComponentModel.DataAnnotations;

namespace StudyFlow.Api.Dtos.Auth;

public sealed class ConfirmEmailRequest
{
    [Required]
    public string UserId { get; init; } = string.Empty;

    [Required]
    public string Token { get; init; } = string.Empty;
}
