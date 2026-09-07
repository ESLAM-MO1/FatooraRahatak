const STORAGE_KEY = "permissions";

export function loadPermissions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function savePermissions(codes: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  window.dispatchEvent(new Event("permissionsUpdated"));
}

export function clearPermissions() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function hasPermission(permissions: string[] | null | undefined, code: string): boolean {
  if (!permissions || permissions.length === 0) return false;
  return permissions.includes(code);
}

export function hasAnyPermission(permissions: string[] | null | undefined, codes: string[]): boolean {
  if (!permissions || permissions.length === 0) return false;
  return codes.some((c) => permissions.includes(c));
}
