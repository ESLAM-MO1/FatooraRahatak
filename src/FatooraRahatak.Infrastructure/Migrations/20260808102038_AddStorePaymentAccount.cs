using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStorePaymentAccount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MoyasarRecipientId",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PaymentAccountStatus",
                table: "Stores",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "PayoutAccountHolder",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayoutBankName",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayoutIban",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PayoutRejectionReason",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MoyasarRecipientId",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "PaymentAccountStatus",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "PayoutAccountHolder",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "PayoutBankName",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "PayoutIban",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "PayoutRejectionReason",
                table: "Stores");
        }
    }
}
