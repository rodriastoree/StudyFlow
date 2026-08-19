namespace StudyFlow.Api.Services;

public sealed record AuthToken(string Value, DateTimeOffset ExpiresAt);
