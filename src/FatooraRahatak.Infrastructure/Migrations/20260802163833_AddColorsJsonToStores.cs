using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddColorsJsonToStores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ColorsJson",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.Sql(@"
-- Backfill ColorsJson from legacy PrimaryColor, per theme. '#12a8db' is the legacy 'not customized' sentinel.
UPDATE Stores
SET ColorsJson = CASE ThemeName
    WHEN 'warm-modern' THEN
        '{""headerColor"":""#fff7ed"",""buttonColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#ea580c' END + '"",""accentColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#c2410c' END + '"",""heroFrom"":""#ffedd5"",""heroTo"":""#fed7aa"",""footerColor"":""#431407"",""newsletterColor"":""#fff7ed""}'
    WHEN 'natural-green' THEN
        '{""headerColor"":""#ffffff"",""buttonColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#16a34a' END + '"",""accentColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#15803d' END + '"",""heroFrom"":""#f0fdf4"",""heroTo"":""#dcfce7"",""footerColor"":""#14532d"",""newsletterColor"":""#f0fdf4""}'
    WHEN 'pink-elegant' THEN
        '{""headerColor"":""#fdf2f8"",""buttonColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#db2777' END + '"",""accentColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#be185d' END + '"",""heroFrom"":""#fdf2f8"",""heroTo"":""#fbcfe8"",""footerColor"":""#500724"",""newsletterColor"":""#fdf2f8""}'
    WHEN 'royal-purple' THEN
        '{""headerColor"":""#1e1b4b"",""buttonColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#7c3aed' END + '"",""accentColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#6d28d9' END + '"",""heroFrom"":""#1e1b4b"",""heroTo"":""#4c1d95"",""footerColor"":""#140d33"",""newsletterColor"":""#1e1b4b""}'
    WHEN 'black-minimal' THEN
        '{""headerColor"":""#0a0a0a"",""buttonColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#171717' END + '"",""accentColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#000000' END + '"",""heroFrom"":""#0a0a0a"",""heroTo"":""#262626"",""footerColor"":""#000000"",""newsletterColor"":""#0a0a0a""}'
    WHEN 'b2b-formal' THEN
        '{""headerColor"":""#1e3a5f"",""buttonColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#2563eb' END + '"",""accentColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#1d4ed8' END + '"",""heroFrom"":""#1e3a5f"",""heroTo"":""#1e40af"",""footerColor"":""#0f1f38"",""newsletterColor"":""#eff6ff""}'
    WHEN 'b2b-calm' THEN
        '{""headerColor"":""#0f766e"",""buttonColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#0f766e' END + '"",""accentColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#115e59' END + '"",""heroFrom"":""#ccfbf1"",""heroTo"":""#99f6e4"",""footerColor"":""#042f2e"",""newsletterColor"":""#f0fdfa""}'
    WHEN 'restaurant' THEN
        '{""headerColor"":""#27272a"",""buttonColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#f59e0b' END + '"",""accentColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#d97706' END + '"",""heroFrom"":""#18181b"",""heroTo"":""#3f3f46"",""footerColor"":""#18181b"",""newsletterColor"":""#27272a""}'
    WHEN 'pharmacy' THEN
        '{""headerColor"":""#ffffff"",""buttonColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#10b981' END + '"",""accentColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#059669' END + '"",""heroFrom"":""#ecfdf5"",""heroTo"":""#a7f3d0"",""footerColor"":""#064e3b"",""newsletterColor"":""#ecfdf5""}'
    ELSE
        '{""headerColor"":""#ffffff"",""buttonColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#12a8db' END + '"",""accentColor"":""' + CASE WHEN PrimaryColor IS NOT NULL AND PrimaryColor <> '' AND PrimaryColor <> '#12a8db' THEN PrimaryColor ELSE '#0e7490' END + '"",""heroFrom"":""#e0f2fe"",""heroTo"":""#bae6fd"",""footerColor"":""#0f172a"",""newsletterColor"":""#f0f9ff""}'
    END
WHERE ColorsJson IS NULL;
");

            migrationBuilder.DropColumn(
                name: "PrimaryColor",
                table: "Stores");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ColorsJson",
                table: "Stores");

            migrationBuilder.AddColumn<string>(
                name: "PrimaryColor",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
