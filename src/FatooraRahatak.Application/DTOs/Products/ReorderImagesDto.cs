using System.Collections.Generic;

namespace FatooraRahatak.Application.DTOs.Products;

public class ReorderImagesDto
{
    public List<long> ImageIds { get; set; } = new();
}
