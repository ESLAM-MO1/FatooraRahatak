using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserIdToTickets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "UserId",
                table: "ContactMessages",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ContactMessages_UserId",
                table: "ContactMessages",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ContactMessages_Users_UserId",
                table: "ContactMessages",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ContactMessages_Users_UserId",
                table: "ContactMessages");

            migrationBuilder.DropIndex(
                name: "IX_ContactMessages_UserId",
                table: "ContactMessages");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "ContactMessages");
        }
    }
}
