using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMobileAppMaker : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "MobileAppMonthlyPrice",
                table: "Packages",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "HasMobileApp",
                table: "Packages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<long>(
                name: "AppSubscriptionId",
                table: "Payments",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "StoreAppSubscriptions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<long>(type: "bigint", nullable: false),
                    PackageId = table.Column<long>(type: "bigint", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    BillingCycle = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PaymentStatus = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DueAmount = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    AutoRenew = table.Column<bool>(type: "bit", nullable: false),
                    DeveloperAccountType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DeveloperAccountInfo = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    MerchantNotes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    AppName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    AdminNote = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    HandledByUserId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoreAppSubscriptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoreAppSubscriptions_Packages_PackageId",
                        column: x => x.PackageId,
                        principalTable: "Packages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_StoreAppSubscriptions_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_AppSubscriptionId",
                table: "Payments",
                column: "AppSubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_StoreAppSubscriptions_PackageId",
                table: "StoreAppSubscriptions",
                column: "PackageId");

            migrationBuilder.CreateIndex(
                name: "IX_StoreAppSubscriptions_StoreId",
                table: "StoreAppSubscriptions",
                column: "StoreId");

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_StoreAppSubscriptions_AppSubscriptionId",
                table: "Payments",
                column: "AppSubscriptionId",
                principalTable: "StoreAppSubscriptions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payments_StoreAppSubscriptions_AppSubscriptionId",
                table: "Payments");

            migrationBuilder.DropTable(
                name: "StoreAppSubscriptions");

            migrationBuilder.DropIndex(
                name: "IX_Payments_AppSubscriptionId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "AppSubscriptionId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "HasMobileApp",
                table: "Packages");

            migrationBuilder.DropColumn(
                name: "MobileAppMonthlyPrice",
                table: "Packages");
        }
    }
}
