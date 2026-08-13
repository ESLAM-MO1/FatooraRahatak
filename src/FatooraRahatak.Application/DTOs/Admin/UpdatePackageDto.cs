namespace FatooraRahatak.Application.DTOs.Admin;

public class UpdatePackageDto
{
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
    public bool HasPos { get; set; }
    public bool HasLogo { get; set; }
    public int MaxThemes { get; set; }
    public decimal CommissionPercentage { get; set; }
    public string Color { get; set; } = "#6B7280";
    public bool HasShippingIntegration { get; set; }
    public bool HasShippingCalculator { get; set; }
    public bool HasShippingTracking { get; set; }
    public bool HasShippingLabelPrinting { get; set; }
    public bool HasFreeShipping { get; set; }
    public bool HasCashOnDelivery { get; set; }
    public bool HasShippingDiscounts { get; set; }
    public bool IsActive { get; set; }
}