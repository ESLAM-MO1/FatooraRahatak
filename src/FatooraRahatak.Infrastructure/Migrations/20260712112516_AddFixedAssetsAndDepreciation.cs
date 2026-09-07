using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddFixedAssetsAndDepreciation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FixedAssets",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<long>(type: "bigint", nullable: false),
                    NameAr = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PurchaseCost = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: false),
                    PurchaseDate = table.Column<DateOnly>(type: "date", nullable: false),
                    UsefulLifeYears = table.Column<int>(type: "int", nullable: false),
                    DepreciationMethod = table.Column<int>(type: "int", nullable: false),
                    AccumulatedDepreciation = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: false),
                    IsFullyDepreciated = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedByUserId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FixedAssets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FixedAssets_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_FixedAssets_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "DepreciationEntries",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FixedAssetId = table.Column<long>(type: "bigint", nullable: false),
                    PeriodMonth = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    DepreciationDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(14,2)", precision: 14, scale: 2, nullable: false),
                    JournalEntryId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedByUserId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DepreciationEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DepreciationEntries_FixedAssets_FixedAssetId",
                        column: x => x.FixedAssetId,
                        principalTable: "FixedAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DepreciationEntries_JournalEntries_JournalEntryId",
                        column: x => x.JournalEntryId,
                        principalTable: "JournalEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DepreciationEntries_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DepreciationEntries_CreatedByUserId",
                table: "DepreciationEntries",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DepreciationEntries_FixedAssetId_PeriodMonth",
                table: "DepreciationEntries",
                columns: new[] { "FixedAssetId", "PeriodMonth" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DepreciationEntries_JournalEntryId",
                table: "DepreciationEntries",
                column: "JournalEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_FixedAssets_CreatedByUserId",
                table: "FixedAssets",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_FixedAssets_StoreId",
                table: "FixedAssets",
                column: "StoreId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DepreciationEntries");

            migrationBuilder.DropTable(
                name: "FixedAssets");
        }
    }
}
