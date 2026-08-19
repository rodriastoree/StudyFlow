using System.ComponentModel.DataAnnotations;

namespace StudyFlow.Api.Dtos.Auth;

public sealed class RegisterRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; init; } = string.Empty;

    [Required]
    public string Password { get; init; } = string.Empty;
}
