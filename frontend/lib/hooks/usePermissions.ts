"use client";
import { useEffect, useState } from "react";
import { loadPermissions, hasPermission } from "@/lib/permissions";

const EVENT = "permissionsUpdated";

export function notifyPermissionsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENT));
}

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>(() => loadPermissions());

  useEffect(() => {
    const handler = () => setPermissions(loadPermissions());
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const can = (code: string) => hasPermission(permissions, code);
  const canAny = (codes: string[]) => codes.some((c) => hasPermission(permissions, c));

  return { permissions, can, canAny };
}
