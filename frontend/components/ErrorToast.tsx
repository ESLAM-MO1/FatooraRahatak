"use client";

import Toast from "@/components/Toast";

interface ErrorToastProps {
  message: string | null;
  className?: string;
  fixed?: boolean;
  onClose?: () => void;
}

export default function ErrorToast({ message, className = "", fixed, onClose }: ErrorToastProps) {
  return <Toast message={message} type="error" className={className} fixed={fixed} onClose={onClose} />;
}