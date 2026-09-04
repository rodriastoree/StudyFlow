namespace StudyFlow.Api.Services.Email;

public interface IEmailService
{
    Task SendEmailConfirmationAsync(
        string recipientEmail,
        string confirmationUrl,
        CancellationToken cancellationToken = default);
}
