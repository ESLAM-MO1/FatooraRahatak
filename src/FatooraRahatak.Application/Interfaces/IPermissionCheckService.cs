namespace FatooraRahatak.Application.Interfaces;

public interface IPermissionCheckService
{
    Task<bool> UserHasPermissionAsync(long userId, string permissionCode);
    Task EnsurePermissionAsync(long userId, string permissionCode);
}
