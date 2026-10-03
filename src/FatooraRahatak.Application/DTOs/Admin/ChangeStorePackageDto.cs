using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Application.DTOs.Admin;

public class ChangeStorePackageDto
{
    public long PackageId { get; set; }
    public BillingCycle BillingCycle { get; set; } = BillingCycle.Yearly;
}
