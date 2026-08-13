"use client";
import { ReactNode } from "react";
import { usePermissions } from "@/lib/hooks/usePermissions";

export default function Can({ code, children }: { code: string; children: ReactNode }) {
  const { can } = usePermissions();
  return <>{can(code) ? children : null}</>;
}
