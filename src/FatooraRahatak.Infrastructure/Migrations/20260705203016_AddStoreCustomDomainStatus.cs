using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStoreCustomDomainStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CustomDomainStatus",
                table: "Stores",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomDomainStatus",
                table: "Stores");
        }
    }
}
