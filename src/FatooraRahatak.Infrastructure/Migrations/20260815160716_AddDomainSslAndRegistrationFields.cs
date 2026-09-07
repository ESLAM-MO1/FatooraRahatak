using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDomainSslAndRegistrationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProfessionalEmailSetups_Stores_StoreId",
                table: "ProfessionalEmailSetups");

            migrationBuilder.AddColumn<string>(
                name: "Issuer",
                table: "SslCertificates",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastRenewedAt",
                table: "SslCertificates",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "NotBefore",
                table: "SslCertificates",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AlterColumn<long>(
                name: "StoreId",
                table: "ProfessionalEmailSetups",
                type: "bigint",
                nullable: true,
                oldClrType: typeof(long),
                oldType: "bigint");

            migrationBuilder.AddColumn<string>(
                name: "EmailAddress",
                table: "ProfessionalEmailSetups",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MailboxName",
                table: "ProfessionalEmailSetups",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RegistrantEmail",
                table: "DomainRegistrationRequests",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RegistrantName",
                table: "DomainRegistrationRequests",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddForeignKey(
                name: "FK_ProfessionalEmailSetups_Stores_StoreId",
                table: "ProfessionalEmailSetups",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ProfessionalEmailSetups_Stores_StoreId",
                table: "ProfessionalEmailSetups");

            migrationBuilder.DropColumn(
                name: "Issuer",
                table: "SslCertificates");

            migrationBuilder.DropColumn(
                name: "LastRenewedAt",
                table: "SslCertificates");

            migrationBuilder.DropColumn(
                name: "NotBefore",
                table: "SslCertificates");

            migrationBuilder.DropColumn(
                name: "EmailAddress",
                table: "ProfessionalEmailSetups");

            migrationBuilder.DropColumn(
                name: "MailboxName",
                table: "ProfessionalEmailSetups");

            migrationBuilder.DropColumn(
                name: "RegistrantEmail",
                table: "DomainRegistrationRequests");

            migrationBuilder.DropColumn(
                name: "RegistrantName",
                table: "DomainRegistrationRequests");

            migrationBuilder.AlterColumn<long>(
                name: "StoreId",
                table: "ProfessionalEmailSetups",
                type: "bigint",
                nullable: false,
                defaultValue: 0L,
                oldClrType: typeof(long),
                oldType: "bigint",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ProfessionalEmailSetups_Stores_StoreId",
                table: "ProfessionalEmailSetups",
                column: "StoreId",
                principalTable: "Stores",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
