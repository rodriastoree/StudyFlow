using Microsoft.AspNetCore.Identity;

namespace StudyFlow.Api.Models;

public class ApplicationUser : IdentityUser<Guid>
{
    public ICollection<StudyItem> StudyItems { get; set; } = [];
}
