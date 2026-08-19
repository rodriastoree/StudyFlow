namespace StudyFlow.Api.Dtos.Auth;

public sealed class AuthenticationResponse
{
    public required string Message { get; init; }

    public string? Token { get; init; }

    public DateTimeOffset? ExpiresAt { get; init; }

    public bool RequiresEmailConfirmation { get; init; }

    public IReadOnlyCollection<string> Errors { get; init; } = [];
}
