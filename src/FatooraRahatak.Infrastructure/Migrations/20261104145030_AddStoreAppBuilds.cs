using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStoreAppBuilds : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StoreAppBuilds",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<long>(type: "bigint", nullable: false),
                    StoreAppSubscriptionId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    GithubRunId = table.Column<long>(type: "bigint", nullable: true),
                    GithubRunUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    PackageName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    VersionName = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    ApkPath = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ApkSizeBytes = table.Column<long>(type: "bigint", nullable: true),
                    ApkSha256 = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    LogTail = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    FinishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TriggeredByUserId = table.Column<long>(type: "bigint", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoreAppBuilds", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoreAppBuilds_StoreAppSubscriptions_StoreAppSubscriptionId",
                        column: x => x.StoreAppSubscriptionId,
                        principalTable: "StoreAppSubscriptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StoreAppBuilds_StoreAppSubscriptionId",
                table: "StoreAppBuilds",
                column: "StoreAppSubscriptionId");

            migrationBuilder.CreateIndex(
                name: "IX_StoreAppBuilds_StoreId_Status",
                table: "StoreAppBuilds",
                columns: new[] { "StoreId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StoreAppBuilds");
        }
    }
}
