using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyFlow.Api.Data;
using StudyFlow.Api.Dtos.StudyItems;
using StudyFlow.Api.Models;

namespace StudyFlow.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/studyitems")]
public sealed class StudyItemsController(ApplicationDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<StudyItemResponse>>> GetAll()
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var items = await dbContext.StudyItems
            .AsNoTracking()
            .Where(item => item.UserId == userId)
            .OrderByDescending(item => item.CreatedAt)
            .Select(item => new StudyItemResponse
            {
                Id = item.Id,
                UserId = item.UserId,
                Type = item.Type,
                Title = item.Title,
                Subject = item.Subject,
                Status = item.Status,
                DueDate = item.DueDate,
                ExamType = item.ExamType,
                ExamInstance = item.ExamInstance,
                PrintedAt = item.PrintedAt,
                IsArchived = item.IsArchived,
                ArchivedAt = item.ArchivedAt,
                ArchivedManually = item.IsArchived,
                CreatedAt = item.CreatedAt,
                UpdatedAt = item.UpdatedAt,
            })
            .ToListAsync();

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<StudyItemResponse>> GetById(Guid id)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var item = await dbContext.StudyItems
            .AsNoTracking()
            .Where(item => item.Id == id && item.UserId == userId)
            .Select(item => new StudyItemResponse
            {
                Id = item.Id,
                UserId = item.UserId,
                Type = item.Type,
                Title = item.Title,
                Subject = item.Subject,
                Status = item.Status,
                DueDate = item.DueDate,
                ExamType = item.ExamType,
                ExamInstance = item.ExamInstance,
                PrintedAt = item.PrintedAt,
                IsArchived = item.IsArchived,
                ArchivedAt = item.ArchivedAt,
                ArchivedManually = item.IsArchived,
                CreatedAt = item.CreatedAt,
                UpdatedAt = item.UpdatedAt,
            })
            .SingleOrDefaultAsync();

        return item is null ? NotFound() : Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<StudyItemResponse>> Create(CreateStudyItemRequest request)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var now = DateTimeOffset.UtcNow;
        var status = GetStoredStatus(request.Type, request.Status);
        var item = new StudyItem
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = request.Type,
            Title = request.Title,
            Subject = request.Subject,
            Status = status,
            DueDate = request.DueDate,
            ExamType = NormalizeOptional(request.ExamType),
            ExamInstance = NormalizeOptional(request.ExamInstance),
            PrintedAt = IsPrintedMaterial(request.Type, status) ? now : null,
            IsArchived = false,
            ArchivedAt = null,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.StudyItems.Add(item);
        await dbContext.SaveChangesAsync();

        var response = ToResponse(item);
        return CreatedAtAction(nameof(GetById), new { id = item.Id }, response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<StudyItemResponse>> Update(Guid id, UpdateStudyItemRequest request)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var item = await dbContext.StudyItems
            .SingleOrDefaultAsync(item => item.Id == id && item.UserId == userId);

        if (item is null)
        {
            return NotFound();
        }

        var now = DateTimeOffset.UtcNow;
        var status = GetStoredStatus(request.Type, request.Status);
        var wasPrinted = IsPrintedMaterial(item.Type, item.Status);
        var willBePrinted = IsPrintedMaterial(request.Type, status);
        var requestedIsArchived = request.IsArchived
            ?? request.ArchivedManually
            ?? item.IsArchived;
        var isRestoring = item.IsArchived && !requestedIsArchived;

        item.Type = request.Type;
        item.Title = request.Title;
        item.Subject = request.Subject;
        item.Status = status;
        item.DueDate = request.DueDate;
        item.ExamType = NormalizeOptional(request.ExamType);
        item.ExamInstance = NormalizeOptional(request.ExamInstance);
        item.PrintedAt = willBePrinted
            ? !wasPrinted || isRestoring
                ? now
                : item.PrintedAt ?? now
            : null;

        if (requestedIsArchived != item.IsArchived)
        {
            item.IsArchived = requestedIsArchived;
            item.ArchivedAt = requestedIsArchived ? now : null;
        }
        else if (!requestedIsArchived)
        {
            item.ArchivedAt = null;
        }

        item.UpdatedAt = now;

        await dbContext.SaveChangesAsync();

        return Ok(ToResponse(item));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var item = await dbContext.StudyItems
            .SingleOrDefaultAsync(item => item.Id == id && item.UserId == userId);

        if (item is null)
        {
            return NotFound();
        }

        dbContext.StudyItems.Remove(item);
        await dbContext.SaveChangesAsync();

        return NoContent();
    }

    private bool TryGetUserId(out Guid userId)
    {
        var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        return Guid.TryParse(value, out userId);
    }

    private static string GetStoredStatus(string type, string requestedStatus)
    {
        return type == "exam" ? "pending" : requestedStatus;
    }

    private static bool IsPrintedMaterial(string type, string status)
    {
        return type == "material" && status == "printed";
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static StudyItemResponse ToResponse(StudyItem item)
    {
        return new StudyItemResponse
        {
            Id = item.Id,
            UserId = item.UserId,
            Type = item.Type,
            Title = item.Title,
            Subject = item.Subject,
            Status = item.Status,
            DueDate = item.DueDate,
            ExamType = item.ExamType,
            ExamInstance = item.ExamInstance,
            PrintedAt = item.PrintedAt,
            IsArchived = item.IsArchived,
            ArchivedAt = item.ArchivedAt,
            ArchivedManually = item.IsArchived,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt,
        };
    }
}