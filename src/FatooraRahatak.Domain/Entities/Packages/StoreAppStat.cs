using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Packages;

// إحصاءات تطبيق المتجر اليومية، مطابقةً لما يعرضه صانع تطبيقات سلة:
// مبيعات التطبيق، مرات التحميل، وصفحة تتبّع رحلة العميل.
public class StoreAppStat : BaseEntity
{
    public long StoreId { get; set; }

    // اليوم الذي تخصّه هذه الأرقام (بتوقيت UTC، مقسوم على اليوم).
    public DateTime StatDate { get; set; }

    public int Installs { get; set; }
    public int Uninstalls { get; set; }
    public int Sessions { get; set; }
    public int Orders { get; set; }
    public decimal Revenue { get; set; }
    public int NewCustomers { get; set; }

    public Store Store { get; set; } = null!;
}
