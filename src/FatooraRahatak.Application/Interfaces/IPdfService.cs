using FatooraRahatak.Application.DTOs.Accounting;

namespace FatooraRahatak.Application.Interfaces;

public interface IPdfService
{
    byte[] GenerateInvoicePdf(InvoiceDto invoice);
}
