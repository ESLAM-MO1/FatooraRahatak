IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Payments')
BEGIN
    CREATE TABLE [Payments] (
        [Id] bigint IDENTITY(1,1) NOT NULL,
        [PaymentReference] nvarchar(max) NOT NULL,
        [InvoiceId] bigint NULL,
        [OrderId] bigint NULL,
        [SubscriptionId] bigint NULL,
        [Amount] decimal(14,2) NOT NULL,
        [Currency] nvarchar(max) NOT NULL DEFAULT 'SAR',
        [Status] int NOT NULL,
        [ProviderType] int NOT NULL,
        [ProviderPaymentId] nvarchar(max) NULL,
        [GatewayResponse] nvarchar(max) NULL,
        [CallbackUrl] nvarchar(max) NULL,
        [WebhookSecret] nvarchar(max) NULL,
        [PaidAt] datetime2 NULL,
        [FailedAt] datetime2 NULL,
        [RefundedAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_Payments] PRIMARY KEY ([Id])
    );
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Payments_InvoiceId')
    CREATE UNIQUE INDEX [IX_Payments_InvoiceId] ON [Payments]([InvoiceId]) WHERE [InvoiceId] IS NOT NULL;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Payments_OrderId')
    CREATE UNIQUE INDEX [IX_Payments_OrderId] ON [Payments]([OrderId]) WHERE [OrderId] IS NOT NULL;

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Payments_SubscriptionId')
    CREATE UNIQUE INDEX [IX_Payments_SubscriptionId] ON [Payments]([SubscriptionId]) WHERE [SubscriptionId] IS NOT NULL;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Invoices') AND name = 'PaymentStatus')
    ALTER TABLE [Invoices] ADD [PaymentStatus] int NOT NULL DEFAULT 0;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Orders') AND name = 'PaymentStatus')
    ALTER TABLE [Orders] ADD [PaymentStatus] int NOT NULL DEFAULT 0;

PRINT 'Payments table and columns created/verified';
