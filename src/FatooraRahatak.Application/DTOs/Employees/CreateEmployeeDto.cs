namespace FatooraRahatak.Application.DTOs.Employees;

public class CreateEmployeeDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty; 
    public decimal Salary { get; set; } = 0;
    public string? NationalId { get; set; }
    public string? NationalAddress { get; set; }
    public DateOnly? BirthDate { get; set; }
    public DateOnly? HireDate { get; set; }
    public string? DeviceUserId { get; set; }
}