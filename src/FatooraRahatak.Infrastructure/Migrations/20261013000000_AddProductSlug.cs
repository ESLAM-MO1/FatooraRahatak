using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProductSlug : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Slug",
                table: "Products",
                type: "nvarchar(450)",
                maxLength: 450,
                nullable: true);

            migrationBuilder.Sql(@"UPDATE Products SET Slug = LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(Sku), ' ', '-'), '_', '-'), '/', '-'), '?', '-'), '#', '-'), '&', '-'), '%', '-'), '.', '-')) WHERE (Slug IS NULL OR Slug = '') AND Sku IS NOT NULL;");

            migrationBuilder.Sql(@"UPDATE Products SET Slug = 'product-' + CAST(Id AS varchar(20)) WHERE Slug IS NULL OR Slug = '';");

            migrationBuilder.Sql(@"WITH d AS (SELECT Id, ROW_NUMBER() OVER (PARTITION BY StoreId, Slug ORDER BY Id) rn FROM Products WHERE Slug IS NOT NULL) UPDATE p SET p.Slug = p.Slug + '-' + CAST(p.Id AS varchar(20)) FROM d INNER JOIN Products p ON p.Id = d.Id WHERE d.rn > 1;");

            migrationBuilder.CreateIndex(
                name: "IX_Products_StoreId_Slug",
                table: "Products",
                columns: new[] { "StoreId", "Slug" },
                unique: true,
                filter: "[Slug] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Products_StoreId_Slug",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "Slug",
                table: "Products");
        }
    }
}
