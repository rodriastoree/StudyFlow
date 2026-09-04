using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Encodings.Web;
using Microsoft.Extensions.Options;
using StudyFlow.Api.Options;

namespace StudyFlow.Api.Services.Email;

public sealed class ResendEmailService(
    HttpClient httpClient,
    IOptions<ResendOptions> options,
    ILogger<ResendEmailService> logger) : IEmailService
{
    private readonly ResendOptions _options = options.Value;

    public async Task SendEmailConfirmationAsync(
        string recipientEmail,
        string confirmationUrl,
        CancellationToken cancellationToken = default)
    {
        EnsureConfigurationIsValid();

        var from = string.IsNullOrWhiteSpace(_options.FromName)
            ? _options.FromEmail
            : $"{_options.FromName.Trim()} <{_options.FromEmail.Trim()}>";
        var safeConfirmationUrl = HtmlEncoder.Default.Encode(confirmationUrl);
        var payload = new
        {
            from,
            to = new[] { recipientEmail },
            subject = "Confirmá tu cuenta de StudyFlow",
            html = $$"""
                <!doctype html>
                <html lang="es">
                <body style="margin:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#202638">
                  <div style="max-width:560px;margin:32px auto;padding:32px;background:#ffffff;border:1px solid #e2e6ef;border-radius:12px">
                    <h1 style="margin:0 0 16px;font-size:24px">Te damos la bienvenida a StudyFlow</h1>
                    <p style="margin:0 0 24px;line-height:1.6">Confirmá tu correo electrónico para activar tu cuenta y empezar a organizar tu estudio.</p>
                    <p style="margin:0 0 24px">
                      <a href="{{safeConfirmationUrl}}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#596fe8;color:#ffffff;text-decoration:none;font-weight:bold">Confirmar mi correo</a>
                    </p>
                    <p style="margin:0 0 12px;line-height:1.6;color:#596174">Si el botón no funciona, copiá y pegá este enlace en tu navegador:</p>
                    <p style="margin:0 0 24px;word-break:break-all"><a href="{{safeConfirmationUrl}}">{{safeConfirmationUrl}}</a></p>
                    <p style="margin:0;color:#72798a;font-size:14px;line-height:1.5">Si no creaste esta cuenta, podés ignorar este correo.</p>
                  </div>
                </body>
                </html>
                """,
            text = $"""
                Te damos la bienvenida a StudyFlow.

                Confirmá tu correo electrónico para activar tu cuenta:
                {confirmationUrl}

                Si no creaste esta cuenta, podés ignorar este correo.
                """,
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "emails")
        {
            Content = JsonContent.Create(payload),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey.Trim());

        using var response = await httpClient.SendAsync(request, cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            return;
        }

        logger.LogError(
            "Resend rechazó el correo de confirmación con el estado HTTP {StatusCode}.",
            (int)response.StatusCode);
        throw new HttpRequestException(
            "Resend rechazó el correo de confirmación.",
            inner: null,
            response.StatusCode);
    }

    private void EnsureConfigurationIsValid()
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new InvalidOperationException("Resend:ApiKey no está configurada.");
        }

        if (string.IsNullOrWhiteSpace(_options.FromEmail))
        {
            throw new InvalidOperationException("Resend:FromEmail no está configurado.");
        }
    }
}
