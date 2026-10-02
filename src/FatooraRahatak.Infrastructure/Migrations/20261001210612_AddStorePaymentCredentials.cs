using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStorePaymentCredentials : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StorePaymentCredentials",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<long>(type: "bigint", nullable: false),
                    Provider = table.Column<int>(type: "int", nullable: false),
                    PublicKey = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    SecretKeyEncrypted = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                    MerchantCode = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    NotificationTokenEncrypted = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    IsTestMode = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StorePaymentCredentials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StorePaymentCredentials_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StorePaymentCredentials_StoreId_Provider",
                table: "StorePaymentCredentials",
                columns: new[] { "StoreId", "Provider" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StorePaymentCredentials");
        }
    }
}
