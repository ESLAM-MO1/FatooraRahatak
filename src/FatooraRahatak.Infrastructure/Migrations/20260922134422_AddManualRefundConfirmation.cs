using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddManualRefundConfirmation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ManualRefundConfirmedAt",
                table: "ReturnRequests",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ManualRefundConfirmedByUserId",
                table: "ReturnRequests",
                type: "bigint",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ManualRefundConfirmedAt",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "ManualRefundConfirmedByUserId",
                table: "ReturnRequests");
        }
    }
}
