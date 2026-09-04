using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using StudyFlow.Api.Dtos.Auth;
using StudyFlow.Api.Models;
using StudyFlow.Api.Options;
using StudyFlow.Api.Services;
using StudyFlow.Api.Services.Email;

namespace StudyFlow.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    UserManager<ApplicationUser> userManager,
    ITokenService tokenService,
    IEmailService emailService,
    IOptions<StudyFlowAppOptions> appOptions,
    ILogger<AuthController> logger) : ControllerBase
{
    private const string InvalidLoginMessage = "Las credenciales son inválidas o la cuenta no está habilitada.";
    private const string InvalidConfirmationMessage = "El enlace de confirmación es inválido o expiró.";

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<AuthenticationResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim();
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            Email = email,
            UserName = email,
        };
        var result = await userManager.CreateAsync(user, request.Password);

        if (!result.Succeeded)
        {
            return BadRequest(new AuthenticationResponse
            {
                Message = "No se pudo crear la cuenta.",
                Errors = result.Errors.Select(error => error.Description).ToArray(),
            });
        }

        try
        {
            var token = await userManager.GenerateEmailConfirmationTokenAsync(user);
            var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
            var confirmationUrl = BuildConfirmationUrl(user.Id, encodedToken);

            await emailService.SendEmailConfirmationAsync(
                email,
                confirmationUrl,
                cancellationToken);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "No se pudo enviar el correo de confirmación.");

            var deleteResult = await userManager.DeleteAsync(user);
            if (!deleteResult.Succeeded)
            {
                logger.LogCritical(
                    "No se pudo revertir la creación del usuario luego de fallar el envío del correo: {Errors}",
                    string.Join(", ", deleteResult.Errors.Select(error => error.Code)));
            }

            return StatusCode(StatusCodes.Status503ServiceUnavailable, new AuthenticationResponse
            {
                Message = "No se pudo enviar el correo de confirmación. Intentá nuevamente más tarde.",
            });
        }

        return StatusCode(StatusCodes.Status201Created, new AuthenticationResponse
        {
            Message = "La cuenta fue creada. Debes confirmar tu correo electrónico antes de iniciar sesión.",
            RequiresEmailConfirmation = true,
        });
    }

    [AllowAnonymous]
    [HttpPost("confirm-email")]
    public async Task<ActionResult<MessageResponse>> ConfirmEmail(ConfirmEmailRequest request)
    {
        if (!Guid.TryParse(request.UserId, out var userId))
        {
            return BadRequest(new MessageResponse { Message = InvalidConfirmationMessage });
        }

        string decodedToken;
        try
        {
            decodedToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.Token));
        }
        catch (FormatException)
        {
            return BadRequest(new MessageResponse { Message = InvalidConfirmationMessage });
        }

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null)
        {
            return BadRequest(new MessageResponse { Message = InvalidConfirmationMessage });
        }

        var tokenIsValid = await userManager.VerifyUserTokenAsync(
            user,
            userManager.Options.Tokens.EmailConfirmationTokenProvider,
            UserManager<ApplicationUser>.ConfirmEmailTokenPurpose,
            decodedToken);

        if (!tokenIsValid)
        {
            return BadRequest(new MessageResponse { Message = InvalidConfirmationMessage });
        }

        if (await userManager.IsEmailConfirmedAsync(user))
        {
            return Ok(new MessageResponse { Message = "El correo ya estaba confirmado." });
        }

        var result = await userManager.ConfirmEmailAsync(user, decodedToken);
        if (!result.Succeeded)
        {
            return BadRequest(new MessageResponse { Message = InvalidConfirmationMessage });
        }

        return Ok(new MessageResponse { Message = "Correo confirmado correctamente." });
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<AuthenticationResponse>> Login(LoginRequest request)
    {
        var user = await userManager.FindByEmailAsync(request.Email.Trim());

        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
        {
            return Unauthorized(new AuthenticationResponse { Message = InvalidLoginMessage });
        }

        if (!await userManager.IsEmailConfirmedAsync(user))
        {
            return Unauthorized(new AuthenticationResponse { Message = InvalidLoginMessage });
        }

        var token = tokenService.CreateToken(user);

        return Ok(new AuthenticationResponse
        {
            Message = "Inicio de sesión correcto.",
            Token = token.Value,
            ExpiresAt = token.ExpiresAt,
        });
    }

    private string BuildConfirmationUrl(Guid userId, string encodedToken)
    {
        var frontendBaseUrl = appOptions.Value.FrontendBaseUrl.Trim().TrimEnd('/');
        if (!Uri.TryCreate(frontendBaseUrl, UriKind.Absolute, out var frontendUri)
            || (frontendUri.Scheme != Uri.UriSchemeHttp && frontendUri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException("App:FrontendBaseUrl no es una URL HTTP(S) válida.");
        }

        return QueryHelpers.AddQueryString(
            $"{frontendBaseUrl}/confirm-email",
            new Dictionary<string, string?>
            {
                ["userId"] = userId.ToString(),
                ["token"] = encodedToken,
            });
    }
}
