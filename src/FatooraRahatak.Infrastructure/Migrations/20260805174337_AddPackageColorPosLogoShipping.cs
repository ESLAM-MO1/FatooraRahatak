using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPackageColorPosLogoShipping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "Packages",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "HasCashOnDelivery",
                table: "Packages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasFreeShipping",
                table: "Packages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasLogo",
                table: "Packages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasPos",
                table: "Packages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasShippingCalculator",
                table: "Packages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasShippingDiscounts",
                table: "Packages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasShippingIntegration",
                table: "Packages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasShippingLabelPrinting",
                table: "Packages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "HasShippingTracking",
                table: "Packages",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Color",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "HasCashOnDelivery",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "HasFreeShipping",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "HasLogo",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "HasPos",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "HasShippingCalculator",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "HasShippingDiscounts",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "HasShippingIntegration",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "HasShippingLabelPrinting",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "HasShippingTracking",
                table: "Packages");
        }
    }
}
