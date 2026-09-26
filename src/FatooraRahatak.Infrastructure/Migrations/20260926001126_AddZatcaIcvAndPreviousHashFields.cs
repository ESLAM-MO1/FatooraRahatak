using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddZatcaIcvAndPreviousHashFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "LastIcv",
                table: "ZatcaCredentials",
                type: "bigint",
                nullable: false,
                defaultValue: 0L);

            migrationBuilder.AddColumn<string>(
                name: "LastInvoiceHash",
                table: "ZatcaCredentials",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "ZatcaIcv",
                table: "Invoices",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ZatcaPreviousInvoiceHash",
                table: "Invoices",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastIcv",
                table: "ZatcaCredentials");

            migrationBuilder.DropColumn(
                name: "LastInvoiceHash",
                table: "ZatcaCredentials");

            migrationBuilder.DropColumn(
                name: "ZatcaIcv",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "ZatcaPreviousInvoiceHash",
                table: "Invoices");
        }
    }
}
