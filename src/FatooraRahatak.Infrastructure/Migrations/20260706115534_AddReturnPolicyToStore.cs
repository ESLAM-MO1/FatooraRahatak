using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReturnPolicyToStore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReturnPolicyText",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReturnPolicyText",
                table: "Stores");
        }
    }
}
