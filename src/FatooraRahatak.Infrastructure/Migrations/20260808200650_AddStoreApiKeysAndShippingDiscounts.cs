using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStoreApiKeysAndShippingDiscounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "FreeShippingThreshold",
                table: "Stores",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "ShippingDiscountPercent",
                table: "Stores",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "StoreApiKeys",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PublicKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SecretKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    IsRevoked = table.Column<bool>(type: "bit", nullable: false),
                    RevokedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    LastUsedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoreApiKeys", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StoreApiKeys_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StoreApiKeys_PublicKey",
                table: "StoreApiKeys",
                column: "PublicKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StoreApiKeys_SecretKey",
                table: "StoreApiKeys",
                column: "SecretKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StoreApiKeys_StoreId",
                table: "StoreApiKeys",
                column: "StoreId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StoreApiKeys");

            migrationBuilder.DropColumn(
                name: "FreeShippingThreshold",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "ShippingDiscountPercent",
                table: "Stores");
        }
    }
}
