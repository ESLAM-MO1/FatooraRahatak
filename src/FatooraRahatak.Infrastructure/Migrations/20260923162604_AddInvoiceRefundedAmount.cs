using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceRefundedAmount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "RefundedAmount",
                table: "Invoices",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_ReturnRequests_ManualRefundConfirmedByUserId",
                table: "ReturnRequests",
                column: "ManualRefundConfirmedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ReturnRequests_Users_ManualRefundConfirmedByUserId",
                table: "ReturnRequests",
                column: "ManualRefundConfirmedByUserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ReturnRequests_Users_ManualRefundConfirmedByUserId",
                table: "ReturnRequests");

            migrationBuilder.DropIndex(
                name: "IX_ReturnRequests_ManualRefundConfirmedByUserId",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "RefundedAmount",
                table: "Invoices");
        }
    }
}
