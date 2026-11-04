using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMobileAppDesignerAndPublish : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AdminReviewNote",
                table: "StoreAppSubscriptions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AppStoreUrl",
                table: "StoreAppSubscriptions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CurrentAppVersion",
                table: "StoreAppSubscriptions",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DesignJson",
                table: "StoreAppSubscriptions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DownloadCount",
                table: "StoreAppSubscriptions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "GooglePlayUrl",
                table: "StoreAppSubscriptions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ListingCategory",
                table: "StoreAppSubscriptions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ListingDescription",
                table: "StoreAppSubscriptions",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ListingIconUrl",
                table: "StoreAppSubscriptions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ListingKeywords",
                table: "StoreAppSubscriptions",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ListingPrivacyUrl",
                table: "StoreAppSubscriptions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ListingScreenshotsJson",
                table: "StoreAppSubscriptions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ListingShortDescription",
                table: "StoreAppSubscriptions",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ListingSupportEmail",
                table: "StoreAppSubscriptions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PublishStatus",
                table: "StoreAppSubscriptions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "PublishedAt",
                table: "StoreAppSubscriptions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SalesCount",
                table: "StoreAppSubscriptions",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "SubmittedAt",
                table: "StoreAppSubscriptions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "StoreAppNotifications",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedByUserId = table.Column<long>(type: "bigint", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Body = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    AutomatedKey = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ScheduledAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    RecipientsCount = table.Column<int>(type: "int", nullable: false),
                    OpensCount = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoreAppNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoreAppNotifications_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StoreAppStats",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<long>(type: "bigint", nullable: false),
                    StatDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Installs = table.Column<int>(type: "int", nullable: false),
                    Uninstalls = table.Column<int>(type: "int", nullable: false),
                    Sessions = table.Column<int>(type: "int", nullable: false),
                    Orders = table.Column<int>(type: "int", nullable: false),
                    Revenue = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    NewCustomers = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoreAppStats", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoreAppStats_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StoreAppNotifications_StoreId",
                table: "StoreAppNotifications",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_StoreAppStats_StoreId",
                table: "StoreAppStats",
                column: "StoreId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StoreAppNotifications");

            migrationBuilder.DropTable(
                name: "StoreAppStats");

            migrationBuilder.DropColumn(
                name: "AdminReviewNote",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "AppStoreUrl",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "CurrentAppVersion",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "DesignJson",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "DownloadCount",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "GooglePlayUrl",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "ListingCategory",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "ListingDescription",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "ListingIconUrl",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "ListingKeywords",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "ListingPrivacyUrl",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "ListingScreenshotsJson",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "ListingShortDescription",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "ListingSupportEmail",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "PublishStatus",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "PublishedAt",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "SalesCount",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "SubmittedAt",
                table: "StoreAppSubscriptions");
        }
    }
}
