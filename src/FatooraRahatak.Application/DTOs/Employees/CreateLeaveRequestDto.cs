namespace FatooraRahatak.Application.DTOs.Employees;

public class CreateLeaveRequestDto
{
    public long EmployeeId { get; set; }
    public string LeaveType { get; set; } = string.Empty; 
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string? Reason { get; set; }
}