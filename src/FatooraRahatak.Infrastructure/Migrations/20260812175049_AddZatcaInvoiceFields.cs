using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddZatcaInvoiceFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ZatcaHash",
                table: "Invoices",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ZatcaQrBase64",
                table: "Invoices",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ZatcaReportingStatus",
                table: "Invoices",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ZatcaSignedXml",
                table: "Invoices",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ZatcaStatus",
                table: "Invoices",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "ZatcaSubmissionDateTime",
                table: "Invoices",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ZatcaUuid",
                table: "Invoices",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ZatcaValidationResults",
                table: "Invoices",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ZatcaCredentials",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<long>(type: "bigint", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    VatNumber = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    Otp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ComplianceRequestId = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ComplianceRequestSecret = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ComplianceUuid = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ProductionCsid = table.Column<string>(type: "nvarchar(max)", maxLength: 4096, nullable: true),
                    ProductionUuid = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    CsidPrivateKey = table.Column<string>(type: "nvarchar(max)", maxLength: 4096, nullable: true),
                    CsidCertificate = table.Column<string>(type: "nvarchar(max)", maxLength: 4096, nullable: true),
                    CsidSecret = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    IssuedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CsidExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SolutionName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ErrorMessage = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    OnboardedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ZatcaCredentials", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ZatcaCredentials_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ZatcaCredentials_StoreId",
                table: "ZatcaCredentials",
                column: "StoreId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ZatcaCredentials");

            migrationBuilder.DropColumn(
                name: "ZatcaHash",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "ZatcaQrBase64",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "ZatcaReportingStatus",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "ZatcaSignedXml",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "ZatcaStatus",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "ZatcaSubmissionDateTime",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "ZatcaUuid",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "ZatcaValidationResults",
                table: "Invoices");
        }
    }
}
