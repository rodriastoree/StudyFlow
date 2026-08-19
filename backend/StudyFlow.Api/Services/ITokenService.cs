using StudyFlow.Api.Models;

namespace StudyFlow.Api.Services;

public interface ITokenService
{
    AuthToken CreateToken(ApplicationUser user);
}
