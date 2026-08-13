namespace FatooraRahatak.Application.DTOs.Employees;

public class UpdateEmployeeDto
{
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public decimal Salary { get; set; } = 0;
    public string Status { get; set; } = "Active";
}
