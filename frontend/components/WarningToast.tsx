"use client";

import Toast from "@/components/Toast";

interface WarningToastProps {
  message: string | null;
  className?: string;
  fixed?: boolean;
  onClose?: () => void;
}

export default function WarningToast({ message, className = "", fixed, onClose }: WarningToastProps) {
  return <Toast message={message} type="warning" className={className} fixed={fixed} onClose={onClose} />;
}