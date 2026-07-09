namespace FatooraRahatak.Application.DTOs.Admin;

public class AdminPackageDto
{
    public long Id { get; set; }
    public string PackageName { get; set; } = string.Empty;
    public decimal MonthlyPrice { get; set; }
    public int? MaxProducts { get; set; }
    public int? MaxOrdersPerMonth { get; set; }
    public int MaxEmployees { get; set; }
    public int MaxWarehouses { get; set; }
    public int MaxBranchesPOS { get; set; }
    public int MaxPaymentGateways { get; set; }
    public int MaxShippingCompanies { get; set; }
    public bool HasAccountingFull { get; set; }
    public bool HasPayroll { get; set; }
    public bool HasZatcaInvoice { get; set; }
    public bool HasCustomDomain { get; set; }
    public bool HasAffiliateMarketing { get; set; }
    public bool HasApiAccess { get; set; }
    public bool IsActive { get; set; }
}