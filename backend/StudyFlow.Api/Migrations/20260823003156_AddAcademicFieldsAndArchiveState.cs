using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyFlow.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAcademicFieldsAndArchiveState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_study_items_type",
                table: "study_items");

            // Renaming preserves every existing archive flag. ArchivedAt remains null for
            // historical rows because the original schema did not record a reliable timestamp.
            migrationBuilder.RenameColumn(
                name: "archived_manually",
                table: "study_items",
                newName: "is_archived");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "archived_at",
                table: "study_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "due_date",
                table: "study_items",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "exam_instance",
                table: "study_items",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "exam_type",
                table: "study_items",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "study_items_user_id_is_archived_type_due_date_idx",
                table: "study_items",
                columns: new[] { "user_id", "is_archived", "type", "due_date" });

            migrationBuilder.AddCheckConstraint(
                name: "ck_study_items_exam_type",
                table: "study_items",
                sql: "exam_type IS NULL OR exam_type IN ('partial', 'final', 'recovery')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_study_items_type",
                table: "study_items",
                sql: "type IN ('task', 'material', 'practical-work', 'exam')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "study_items_user_id_is_archived_type_due_date_idx",
                table: "study_items");

            migrationBuilder.DropCheckConstraint(
                name: "ck_study_items_exam_type",
                table: "study_items");

            migrationBuilder.DropCheckConstraint(
                name: "ck_study_items_type",
                table: "study_items");

            migrationBuilder.DropColumn(
                name: "archived_at",
                table: "study_items");

            migrationBuilder.DropColumn(
                name: "due_date",
                table: "study_items");

            migrationBuilder.DropColumn(
                name: "exam_instance",
                table: "study_items");

            migrationBuilder.DropColumn(
                name: "exam_type",
                table: "study_items");

            migrationBuilder.RenameColumn(
                name: "is_archived",
                table: "study_items",
                newName: "archived_manually");

            migrationBuilder.AddCheckConstraint(
                name: "ck_study_items_type",
                table: "study_items",
                sql: "type IN ('task', 'material')");
        }
    }
}
