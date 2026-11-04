using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStoreAppKeystoreAndTagline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "KeyAlias",
                table: "StoreAppSubscriptions",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KeyPassword",
                table: "StoreAppSubscriptions",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KeystoreBase64",
                table: "StoreAppSubscriptions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "KeystoreCreatedAt",
                table: "StoreAppSubscriptions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KeystorePassword",
                table: "StoreAppSubscriptions",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tagline",
                table: "StoreAppSubscriptions",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "KeyAlias",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "KeyPassword",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "KeystoreBase64",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "KeystoreCreatedAt",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "KeystorePassword",
                table: "StoreAppSubscriptions");

            migrationBuilder.DropColumn(
                name: "Tagline",
                table: "StoreAppSubscriptions");
        }
    }
}
