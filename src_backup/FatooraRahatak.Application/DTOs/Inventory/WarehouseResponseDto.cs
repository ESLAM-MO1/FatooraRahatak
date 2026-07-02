namespace FatooraRahatak.Application.DTOs.Inventory;

public class WarehouseResponseDto
{
    public long Id { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
}