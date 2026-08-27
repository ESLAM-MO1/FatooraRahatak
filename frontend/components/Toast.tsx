"use client";

import { AppToast } from "@/components/AppAlert";
import type { AlertType } from "@/components/AppAlert";

export type ToastType = AlertType;

interface ToastProps {
  message: string | null;
  type?: ToastType;
  className?: string;
  fixed?: boolean;
  onClose?: () => void;
}

export default function Toast({
  message,
  type = "success",
  className = "",
  fixed = true,
  onClose,
}: ToastProps) {
  return <AppToast message={message} type={type} className={className} fixed={fixed} onClose={onClose} />;
}
