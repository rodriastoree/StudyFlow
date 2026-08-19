using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using StudyFlow.Api.Dtos.Auth;
using StudyFlow.Api.Models;
using StudyFlow.Api.Services;

namespace StudyFlow.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    UserManager<ApplicationUser> userManager,
    ITokenService tokenService) : ControllerBase
{
    private const string InvalidLoginMessage = "Las credenciales son inválidas o la cuenta no está habilitada.";

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<AuthenticationResponse>> Register(RegisterRequest request)
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

        return StatusCode(StatusCodes.Status201Created, new AuthenticationResponse
        {
            Message = "La cuenta fue creada. Debes confirmar tu correo electrónico antes de iniciar sesión.",
            RequiresEmailConfirmation = true,
        });
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
}
