using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using StudyFlow.Api.Models;

namespace StudyFlow.Api.Data;

public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<StudyItem> StudyItems => Set<StudyItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ApplicationUser>()
            .Property(user => user.Email)
            .IsRequired();

        modelBuilder.Entity<StudyItem>(entity =>
        {
            entity.ToTable("study_items", table =>
            {
                table.HasCheckConstraint(
                    "ck_study_items_type",
                    "type IN ('task', 'material')");
                table.HasCheckConstraint(
                    "ck_study_items_status",
                    "status IN ('pending', 'completed', 'to-summarize', 'summarized', 'printed')");
            });

            entity.HasKey(item => item.Id);

            entity.Property(item => item.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()")
                .ValueGeneratedOnAdd();

            entity.Property(item => item.UserId)
                .HasColumnName("user_id")
                .IsRequired();

            entity.Property(item => item.Type)
                .HasColumnName("type")
                .IsRequired();

            entity.Property(item => item.Title)
                .HasColumnName("title")
                .HasMaxLength(160)
                .IsRequired();

            entity.Property(item => item.Subject)
                .HasColumnName("subject")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(item => item.Status)
                .HasColumnName("status")
                .IsRequired();

            entity.Property(item => item.PrintedAt)
                .HasColumnName("printed_at")
                .HasColumnType("timestamp with time zone");

            entity.Property(item => item.ArchivedManually)
                .HasColumnName("archived_manually")
                .HasDefaultValue(false)
                .IsRequired();

            entity.Property(item => item.CreatedAt)
                .HasColumnName("created_at")
                .HasColumnType("timestamp with time zone")
                .HasDefaultValueSql("now()")
                .ValueGeneratedOnAdd();

            entity.Property(item => item.UpdatedAt)
                .HasColumnName("updated_at")
                .HasColumnType("timestamp with time zone")
                .HasDefaultValueSql("now()")
                .ValueGeneratedOnAdd();

            entity.HasOne(item => item.User)
                .WithMany(user => user.StudyItems)
                .HasForeignKey(item => item.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(item => new { item.UserId, item.CreatedAt })
                .IsDescending(false, true)
                .HasDatabaseName("study_items_user_id_created_at_idx");
        });
    }
}
