using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDomainEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DnsRecords",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RecordType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: true),
                    Ttl = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DnsRecords", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DomainBlacklistEntries",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DomainPattern = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BlockedByUserId = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DomainBlacklistEntries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DomainRegistrationRequests",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<long>(type: "bigint", nullable: true),
                    DomainName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RegistrarApi = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ResponseDetails = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DomainRegistrationRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DomainRegistrationRequests_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ManagedDomains",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<long>(type: "bigint", nullable: true),
                    DomainName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    TargetIp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TargetCname = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DnsVerifiedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    SslEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManagedDomains", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ManagedDomains_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ProfessionalEmailSetups",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StoreId = table.Column<long>(type: "bigint", nullable: false),
                    DomainName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EmailProvider = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    MxRecordsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfessionalEmailSetups", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProfessionalEmailSetups_Stores_StoreId",
                        column: x => x.StoreId,
                        principalTable: "Stores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RedirectRules",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SourceDomain = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SourcePath = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TargetUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsPermanent = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RedirectRules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SslCertificates",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ManagedDomainId = table.Column<long>(type: "bigint", nullable: false),
                    CertificateData = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PrivateKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    FailureReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SslCertificates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SslCertificates_ManagedDomains_ManagedDomainId",
                        column: x => x.ManagedDomainId,
                        principalTable: "ManagedDomains",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DomainRegistrationRequests_StoreId",
                table: "DomainRegistrationRequests",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_ManagedDomains_StoreId",
                table: "ManagedDomains",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_ProfessionalEmailSetups_StoreId",
                table: "ProfessionalEmailSetups",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_SslCertificates_ManagedDomainId",
                table: "SslCertificates",
                column: "ManagedDomainId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DnsRecords");

            migrationBuilder.DropTable(
                name: "DomainBlacklistEntries");

            migrationBuilder.DropTable(
                name: "DomainRegistrationRequests");

            migrationBuilder.DropTable(
                name: "ProfessionalEmailSetups");

            migrationBuilder.DropTable(
                name: "RedirectRules");

            migrationBuilder.DropTable(
                name: "SslCertificates");

            migrationBuilder.DropTable(
                name: "ManagedDomains");
        }
    }
}
