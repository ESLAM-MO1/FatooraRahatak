using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMarketingAndMerchantSuspension : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdminNote",
                table: "Referrals",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "Referrals",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ReviewedById",
                table: "Referrals",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ReviewedByUserId",
                table: "Referrals",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Referrals",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RejectReason",
                table: "MerchantDocument",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "MerchantDocument",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ReviewedById",
                table: "MerchantDocument",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ReviewedByUserId",
                table: "MerchantDocument",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "MerchantDocument",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "SuspendedAt",
                table: "MerchantAccounts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SuspensionReason",
                table: "MerchantAccounts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ReportSchedules",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Frequency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReportScope = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    KpisJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecipientsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    LastRunAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NextRunAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportSchedules", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Referrals_ReviewedById",
                table: "Referrals",
                column: "ReviewedById");

            migrationBuilder.CreateIndex(
                name: "IX_MerchantDocument_ReviewedById",
                table: "MerchantDocument",
                column: "ReviewedById");

            migrationBuilder.AddForeignKey(
                name: "FK_MerchantDocument_Users_ReviewedById",
                table: "MerchantDocument",
                column: "ReviewedById",
                principalTable: "Users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Referrals_Users_ReviewedById",
                table: "Referrals",
                column: "ReviewedById",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MerchantDocument_Users_ReviewedById",
                table: "MerchantDocument");

            migrationBuilder.DropForeignKey(
                name: "FK_Referrals_Users_ReviewedById",
                table: "Referrals");

            migrationBuilder.DropTable(
                name: "ReportSchedules");

            migrationBuilder.DropIndex(
                name: "IX_Referrals_ReviewedById",
                table: "Referrals");

            migrationBuilder.DropIndex(
                name: "IX_MerchantDocument_ReviewedById",
                table: "MerchantDocument");

            migrationBuilder.DropColumn(
                name: "AdminNote",
                table: "Referrals");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "Referrals");

            migrationBuilder.DropColumn(
                name: "ReviewedById",
                table: "Referrals");

            migrationBuilder.DropColumn(
                name: "ReviewedByUserId",
                table: "Referrals");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Referrals");

            migrationBuilder.DropColumn(
                name: "RejectReason",
                table: "MerchantDocument");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "MerchantDocument");

            migrationBuilder.DropColumn(
                name: "ReviewedById",
                table: "MerchantDocument");

            migrationBuilder.DropColumn(
                name: "ReviewedByUserId",
                table: "MerchantDocument");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "MerchantDocument");

            migrationBuilder.DropColumn(
                name: "SuspendedAt",
                table: "MerchantAccounts");

            migrationBuilder.DropColumn(
                name: "SuspensionReason",
                table: "MerchantAccounts");
        }
    }
}
