namespace FatooraRahatak.Application.DTOs.Employees;

public class EmployeeResponseDto
{
    public long Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public decimal Salary { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateOnly HireDate { get; set; }
}