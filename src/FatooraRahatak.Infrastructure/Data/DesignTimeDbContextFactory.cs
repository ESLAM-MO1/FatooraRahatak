using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace FatooraRahatak.Infrastructure.Data;

public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("FATOORA_CONNECTION_STRING")
            ?? "Server=localhost\\SQLEXPRESS;Database=FatooraRahatak;Trusted_Connection=True;TrustServerCertificate=True;Connection Timeout=60;Pooling=true;Min Pool Size=2;Max Pool Size=20;";

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        return new AppDbContext(optionsBuilder.Options);
    }
}
