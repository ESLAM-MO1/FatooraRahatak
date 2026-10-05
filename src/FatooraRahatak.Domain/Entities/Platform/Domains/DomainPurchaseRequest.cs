using System.ComponentModel.DataAnnotations;
using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Platform.Domains;

public enum DomainPurchaseRequestStatus { Pending, Completed, Rejected }

public class DomainPurchaseRequest : BaseEntity
{
    public long StoreId { get; set; }
    public long RequestedByUserId { get; set; }

    [MaxLength(100)]
    public string PreferredName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Notes { get; set; }

    public DomainPurchaseRequestStatus Status { get; set; } = DomainPurchaseRequestStatus.Pending;

    [MaxLength(255)]
    public string? AssignedDomain { get; set; }

    [MaxLength(500)]
    public string? AdminNote { get; set; }

    public long? HandledByUserId { get; set; }
    public DateTime? HandledAt { get; set; }

    public Store? Store { get; set; }
}
