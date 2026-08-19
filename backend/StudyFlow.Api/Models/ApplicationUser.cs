namespace StudyFlow.Api.Models;

public class ApplicationUser
{
    public Guid Id { get; set; }

    public ICollection<StudyItem> StudyItems { get; set; } = [];
}
