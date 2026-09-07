using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixPaymentSecurityAndRoleScoping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DueAmount",
                table: "Subscriptions",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "IsSimulation",
                table: "Shipments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<long>(
                name: "StoreId",
                table: "Roles",
                type: "bigint",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DueAmount",
                table: "Subscriptions");

            migrationBuilder.DropColumn(
                name: "IsSimulation",
                table: "Shipments");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "Roles");
        }
    }
}
