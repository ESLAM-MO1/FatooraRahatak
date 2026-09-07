using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FatooraRahatak.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixMarketingIntegrationColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'AccessToken' AND Object_ID = Object_ID(N'MarketingIntegrations'))
                BEGIN
                    ALTER TABLE MarketingIntegrations ADD AccessToken NVARCHAR(MAX) NULL;
                END

                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'EnableServerSideTracking' AND Object_ID = Object_ID(N'MarketingIntegrations'))
                BEGIN
                    ALTER TABLE MarketingIntegrations ADD EnableServerSideTracking BIT NOT NULL DEFAULT 0;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccessToken",
                table: "MarketingIntegrations");

            migrationBuilder.DropColumn(
                name: "EnableServerSideTracking",
                table: "MarketingIntegrations");
        }
    }
}