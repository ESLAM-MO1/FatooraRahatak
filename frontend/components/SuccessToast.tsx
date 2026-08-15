"use client";

import Toast from "@/components/Toast";

interface SuccessToastProps {
  message: string | null;
  className?: string;
  fixed?: boolean;
  onClose?: () => void;
}

export default function SuccessToast({ message, className = "", fixed, onClose }: SuccessToastProps) {
  return <Toast message={message} type="success" className={className} fixed={fixed} onClose={onClose} />;
}