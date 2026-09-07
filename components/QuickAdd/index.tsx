"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import "@/lib/i18n/config";
import AddProductModal from "./AddProductModal";
import AddEmployeeModal from "./AddEmployeeModal";
import AddWarehouseModal from "./AddWarehouseModal";

export type QuickAddType = "products" | "employees" | "warehouses" | null;

interface Props {
  type: QuickAddType;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

export default function QuickAddManager({ type, onClose, onSuccess }: Props) {
  if (!type) return null;

  switch (type) {
    case "products":
      return <AddProductModal onClose={onClose} onSuccess={onSuccess} />;
    case "employees":
      return <AddEmployeeModal onClose={onClose} onSuccess={onSuccess} />;
    case "warehouses":
      return <AddWarehouseModal onClose={onClose} onSuccess={onSuccess} />;
    default:
      return null;
  }
}
