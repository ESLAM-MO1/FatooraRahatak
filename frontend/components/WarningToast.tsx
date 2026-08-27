"use client";

import { AppToast } from "@/components/AppAlert";

interface WarningToastProps {
  message: string | null;
  className?: string;
  fixed?: boolean;
  onClose?: () => void;
}

export default function WarningToast({ message, className = "", fixed, onClose }: WarningToastProps) {
  return <AppToast message={message} type="warning" className={className} fixed={fixed} onClose={onClose} />;
}