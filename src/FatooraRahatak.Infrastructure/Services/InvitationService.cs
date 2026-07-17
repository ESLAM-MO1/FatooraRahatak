using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Employees;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Employees;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class InvitationService : IInvitationService
{
    private readonly AppDbContext _context;

    public InvitationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<StoreInvitationResponseDto> CreateInvitationAsync(long ownerUserId, CreateInvitationDto dto)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك");

        var hasPending = await _context.Set<StoreInvitation>().AnyAsync(i => i.Email == dto.Email && i.StoreId == store.Id && i.Status == "Pending");
        if (hasPending)
            throw new InvalidOperationException("يوجد دعوة معلقة لهذا البريد بالفعل");

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == dto.RoleId);
        if (role == null)
            throw new InvalidOperationException("الدور غير موجود");

        var token = Guid.NewGuid().ToString("N")[..16];

        var invitation = new StoreInvitation
        {
            StoreId = store.Id,
            Email = dto.Email,
            InvitedByName = (await _context.Users.FindAsync(ownerUserId))?.FullName ?? "",
            Token = token,
            RoleId = dto.RoleId,
            Status = "Pending",
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _context.Set<StoreInvitation>().Add(invitation);
        await _context.SaveChangesAsync();

        return new StoreInvitationResponseDto
        {
            Id = invitation.Id,
            Email = invitation.Email,
            Status = invitation.Status,
            RoleName = role.RoleName,
            Token = invitation.Token,
            CreatedAt = invitation.CreatedAt,
            ExpiresAt = invitation.ExpiresAt
        };
    }

    public async Task<List<StoreInvitationResponseDto>> GetInvitationsAsync(long ownerUserId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            return new();

        return await _context.Set<StoreInvitation>()
            .Where(i => i.StoreId == store.Id)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new StoreInvitationResponseDto
            {
                Id = i.Id,
                Email = i.Email,
                Status = i.Status,
                RoleName = _context.Roles.Where(r => r.Id == i.RoleId).Select(r => r.RoleName).FirstOrDefault() ?? "",
                Token = i.Token,
                CreatedAt = i.CreatedAt,
                ExpiresAt = i.ExpiresAt
            })
            .ToListAsync();
    }

    public async Task AcceptInvitationAsync(string token, long userId)
    {
        var invitation = await _context.Set<StoreInvitation>()
            .FirstOrDefaultAsync(i => i.Token == token && i.Status == "Pending");

        if (invitation == null || invitation.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException("الدعوة غير صالحة أو منتهية الصلاحية");

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new InvalidOperationException("المستخدم غير موجود");

        user.UserType = UserType.Employee;
        user.IsVerified = true;

        var employee = new Employee
        {
            UserId = userId,
            StoreId = invitation.StoreId,
            RoleId = invitation.RoleId,
            HireDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Salary = 0,
            Status = "Active"
        };

        _context.Employees.Add(employee);
        invitation.Status = "Accepted";
        await _context.SaveChangesAsync();
    }
}
