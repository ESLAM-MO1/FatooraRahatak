try {
    $connStr = "Server=localhost\SQLEXPRESS;Database=FatooraRahatak;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=no"
    $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
    $conn.Open()
    $cmd = $conn.CreateCommand()

    # Drop Payments table if exists
    $cmd.CommandText = "IF OBJECT_ID('Payments') IS NOT NULL DROP TABLE [Payments]"
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "Dropped Payments table if existed"

    # Delete bad migration entries
    $cmd.CommandText = "DELETE FROM [__EFMigrationsHistory] WHERE MigrationId LIKE '%AddPayment%'"
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "Cleaned migration history"

    # Add PaymentStatus to Invoices
    $cmd.CommandText = "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Invoices') AND name = 'PaymentStatus') ALTER TABLE [Invoices] ADD [PaymentStatus] int NOT NULL DEFAULT 0"
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "Ensured PaymentStatus column on Invoices"

    # Add PaymentStatus to Orders
    $cmd.CommandText = "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'PaymentStatus') ALTER TABLE [Orders] ADD [PaymentStatus] int NOT NULL DEFAULT 0"
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "Ensured PaymentStatus column on Orders"

    # Reset migration tracker to last good migration
    $cmd.CommandText = "DELETE FROM [__EFMigrationsHistory] WHERE MigrationId > '20260726125332_AddAttemptsToVerificationCode'"
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "Reset migration tracker to last good state"

    $conn.Close()
    Write-Host "All DB operations completed successfully"
} catch {
    Write-Host "Error: $_"
}