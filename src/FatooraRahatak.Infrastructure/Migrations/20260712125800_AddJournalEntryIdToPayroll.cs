using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddJournalEntryIdToPayroll : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "JournalEntryId",
                table: "Payrolls",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payrolls_JournalEntryId",
                table: "Payrolls",
                column: "JournalEntryId");

            migrationBuilder.AddForeignKey(
                name: "FK_Payrolls_JournalEntries_JournalEntryId",
                table: "Payrolls",
                column: "JournalEntryId",
                principalTable: "JournalEntries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payrolls_JournalEntries_JournalEntryId",
                table: "Payrolls");

            migrationBuilder.DropIndex(
                name: "IX_Payrolls_JournalEntryId",
                table: "Payrolls");

            migrationBuilder.DropColumn(
                name: "JournalEntryId",
                table: "Payrolls");
        }
    }
}
