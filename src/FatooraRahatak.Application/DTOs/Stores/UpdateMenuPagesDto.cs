namespace FatooraRahatak.Application.DTOs.Stores;

public class UpdateMenuPagesDto
{
    // JSON array من { id, isEnabled, order } لعناصر القائمة الرئيسية
    public string? MenuConfigJson { get; set; }

    // JSON array من { key, titleAr, titleEn, contentAr, contentEn, isEnabled } لصفحات المتجر
    public string? StorePagesJson { get; set; }
}
