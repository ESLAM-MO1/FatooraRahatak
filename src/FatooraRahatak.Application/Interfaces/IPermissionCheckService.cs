namespace FatooraRahatak.Application.Interfaces;

public interface IPermissionCheckService
{
    Task<bool> UserHasPermissionAsync(long userId, string permissionCode);
    Task EnsurePermissionAsync(long userId, string permissionCode);

    /// <summary>
    /// Resolves the store the user belongs to: owner via Stores.OwnerUserId,
    /// or active employee via Employees.StoreId. Returns null if none.
    /// </summary>
    Task<long?> GetUserStoreIdAsync(long userId);

    /// <summary>
    /// Returns the effective permission codes for the user (role perms merged
    /// with overrides), or all codes for SuperAdmin/Owner.
    /// </summary>
    Task<List<string>> GetUserPermissionCodesAsync(long userId);
}
