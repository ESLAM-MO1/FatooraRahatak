DROP TABLE IF EXISTS [Payments];
DELETE FROM [__EFMigrationsHistory] WHERE MigrationId LIKE '%AddPayment%';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Invoices') AND name = 'PaymentStatus')
    ALTER TABLE [Invoices] ADD [PaymentStatus] int NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'PaymentStatus')
    ALTER TABLE [Orders] ADD [PaymentStatus] int NOT NULL DEFAULT 0;
PRINT 'Cleanup done';
