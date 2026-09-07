using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAdvancedStoreSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CustomerNotificationEmail",
                table: "Stores",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CustomerNotificationWhatsapp",
                table: "Stores",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsCouponsEnabled",
                table: "Stores",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsReviewsEnabled",
                table: "Stores",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsSearchEnabled",
                table: "Stores",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "LowStockThreshold",
                table: "Stores",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReturnPolicyDays",
                table: "Stores",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrustBadgesJson",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomerNotificationEmail",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "CustomerNotificationWhatsapp",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "IsCouponsEnabled",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "IsReviewsEnabled",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "IsSearchEnabled",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "LowStockThreshold",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "ReturnPolicyDays",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "TrustBadgesJson",
                table: "Stores");
        }
    }
}
