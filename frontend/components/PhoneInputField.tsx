"use client";

import PhoneInputWithCountry, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { normalizePhone } from "@/lib/phone";

interface PhoneInputFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

export default function PhoneInputField({
  id,
  value,
  onChange,
  required,
  placeholder = "5xxxxxxxx",
  className = "field-shell",
}: PhoneInputFieldProps) {
  // Old data may be stored without a country code (not E.164).
  // The library only accepts a valid E.164 string as `value`, otherwise it throws.
  const safeValue = value && value.startsWith("+") && isValidPhoneNumber(value) ? value : undefined;

  return (
    <div className={className} dir="ltr">
      <PhoneInputWithCountry
        id={id}
        international
        defaultCountry="SA"
        value={safeValue}
        onChange={(v) => onChange(v ? normalizePhone(v) || "" : "")}
        placeholder={!safeValue && value ? `${value} (${placeholder})` : placeholder}
        required={required}
      />
    </div>
  );
}