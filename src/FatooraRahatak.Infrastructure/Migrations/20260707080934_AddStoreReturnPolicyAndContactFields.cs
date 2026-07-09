using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStoreReturnPolicyAndContactFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactAddress",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactEmail",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactPhone",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactAddress",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "ContactEmail",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "ContactPhone",
                table: "Stores");
        }
    }
}
