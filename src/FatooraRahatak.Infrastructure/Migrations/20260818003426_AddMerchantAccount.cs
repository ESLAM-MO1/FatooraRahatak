using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMerchantAccount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MerchantAccounts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<long>(type: "bigint", nullable: false),
                    BrandName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    WebsiteUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LogoPath = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    LegalName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LicenseType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LicenseNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OwnerFirstName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OwnerMiddleName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OwnerLastName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OwnerEmail = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OwnerCountryCode = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OwnerPhone = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AddressCountry = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AddressCity = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    BirthDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    NationalIdNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsSubmitted = table.Column<bool>(type: "bit", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MerchantAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MerchantAccounts_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MerchantAccounts_StoreId",
                table: "MerchantAccounts",
                column: "StoreId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MerchantAccounts");
        }
    }
}
