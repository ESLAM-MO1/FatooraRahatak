using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCodFeeToOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CodFee",
                table: "Orders",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CodFee",
                table: "Orders");
        }
    }
}
