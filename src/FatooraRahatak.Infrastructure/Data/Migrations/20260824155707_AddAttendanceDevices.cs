using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAttendanceDevices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "CreatedByUserId",
                table: "Attendances",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "DeviceId",
                table: "Attendances",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Method",
                table: "Attendances",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "AttendanceDevices",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<long>(type: "bigint", nullable: false),
                    DeviceName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DeviceIp = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Port = table.Column<int>(type: "int", nullable: false),
                    Method = table.Column<int>(type: "int", nullable: false),
                    Location = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    LastSyncedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AttendanceDevices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AttendanceDevices_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AttendanceDevices_StoreId",
                table: "AttendanceDevices",
                column: "StoreId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AttendanceDevices");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "DeviceId",
                table: "Attendances");

            migrationBuilder.DropColumn(
                name: "Method",
                table: "Attendances");
        }
    }
}
