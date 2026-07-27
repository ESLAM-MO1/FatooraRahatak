try {
    $connStr = "Server=localhost\SQLEXPRESS;Database=FatooraRahatak;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=no"
    $conn = New-Object System.Data.SqlClient.SqlConnection($connStr)
    $conn.Open()
    $cmd = $conn.CreateCommand()

    # Create Payments table if not exists
    $cmd.CommandText = "IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Payments') CREATE TABLE [Payments] ([Id] bigint IDENTITY(1,1) NOT NULL, [PaymentReference] nvarchar(max) NOT NULL, [InvoiceId] bigint NULL, [OrderId] bigint NULL, [SubscriptionId] bigint NULL, [Amount] decimal(14,2) NOT NULL, [Currency] nvarchar(max) NOT NULL DEFAULT 'SAR', [Status] int NOT NULL, [ProviderType] int NOT NULL, [ProviderPaymentId] nvarchar(max) NULL, [GatewayResponse] nvarchar(max) NULL, [CallbackUrl] nvarchar(max) NULL, [WebhookSecret] nvarchar(max) NULL, [PaidAt] datetime2 NULL, [FailedAt] datetime2 NULL, [RefundedAt] datetime2 NULL, [CreatedAt] datetime2 NOT NULL, [UpdatedAt] datetime2 NULL, CONSTRAINT [PK_Payments] PRIMARY KEY ([Id]))"
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "Payments table created/verified"

    # Create indexes
    $cmd.CommandText = "IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Payments_InvoiceId') CREATE UNIQUE INDEX [IX_Payments_InvoiceId] ON [Payments]([InvoiceId]) WHERE [InvoiceId] IS NOT NULL"
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "IX_Payments_InvoiceId verified"

    $cmd.CommandText = "IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Payments_OrderId') CREATE UNIQUE INDEX [IX_Payments_OrderId] ON [Payments]([OrderId]) WHERE [OrderId] IS NOT NULL"
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "IX_Payments_OrderId verified"

    $cmd.CommandText = "IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Payments_SubscriptionId') CREATE UNIQUE INDEX [IX_Payments_SubscriptionId] ON [Payments]([SubscriptionId]) WHERE [SubscriptionId] IS NOT NULL"
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "IX_Payments_SubscriptionId verified"

    # Add PaymentStatus to Invoices if missing
    $cmd.CommandText = "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Invoices') AND name = 'PaymentStatus') ALTER TABLE [Invoices] ADD [PaymentStatus] int NOT NULL DEFAULT 0"
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "PaymentStatus on Invoices verified"

    # Add PaymentStatus to Orders if missing
    $cmd.CommandText = "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'PaymentStatus') ALTER TABLE [Orders] ADD [PaymentStatus] int NOT NULL DEFAULT 0"
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "PaymentStatus on Orders verified"

    # Mark AddPaymentSystem migration as applied
    $cmd.CommandText = "IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE MigrationId = '20260726161430_AddPaymentSystem') INSERT INTO [__EFMigrationsHistory] (MigrationId, ProductVersion) VALUES ('20260726161430_AddPaymentSystem', '10.0.9')"
    $cmd.ExecuteNonQuery() | Out-Null
    Write-Host "Migration marked as applied"

    $conn.Close()
    Write-Host "All DB operations completed successfully"
} catch {
    Write-Host "Error: $_"
}