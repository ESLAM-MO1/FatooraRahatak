using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMerchantAccountStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "MerchantAccounts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "MerchantAccounts",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ReviewedByUserId",
                table: "MerchantAccounts",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "MerchantAccounts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_MerchantAccounts_ReviewedByUserId",
                table: "MerchantAccounts",
                column: "ReviewedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_MerchantAccounts_Users_ReviewedByUserId",
                table: "MerchantAccounts",
                column: "ReviewedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MerchantAccounts_Users_ReviewedByUserId",
                table: "MerchantAccounts");

            migrationBuilder.DropIndex(
                name: "IX_MerchantAccounts_ReviewedByUserId",
                table: "MerchantAccounts");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "MerchantAccounts");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "MerchantAccounts");

            migrationBuilder.DropColumn(
                name: "ReviewedByUserId",
                table: "MerchantAccounts");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "MerchantAccounts");
        }
    }
}
