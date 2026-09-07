"use client";

import { AppToast } from "@/components/AppAlert";

interface SuccessToastProps {
  message: string | null;
  className?: string;
  fixed?: boolean;
  onClose?: () => void;
}

export default function SuccessToast({ message, className = "", fixed, onClose }: SuccessToastProps) {
  return <AppToast message={message} type="success" className={className} fixed={fixed} onClose={onClose} />;
}
