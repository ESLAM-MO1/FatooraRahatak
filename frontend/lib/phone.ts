import { isValidPhoneNumber, parsePhoneNumber, type Country } from "react-phone-number-input";

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)));
}

function clean(value: string): string {
  return toLatinDigits(value).replace(/[\s\-().]/g, "");
}

// Returns a clean E.164 phone number (accepts any country), or null if unparseable.
// `defaultCountry` is only used to interpret a number typed without a country code.
export function normalizePhone(raw: string, defaultCountry?: Country): string | null {
  if (!raw) return null;

  let s = clean(raw);
  if (s.startsWith("00")) s = "+" + s.slice(2);

  if (s.startsWith("+")) {
    let digits = s.slice(1);
    // Fix accidental duplicate country code, e.g. "+96696605..." typed after the shown prefix.
    if (digits.startsWith("966") && digits.slice(3).startsWith("966")) {
      digits = digits.slice(3);
    }
    return "+" + digits;
  }

  let digits = s.replace(/\D/g, "");
  if (digits.startsWith("966")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);

  if (defaultCountry && digits) {
    try {
      const parsed = parsePhoneNumber(digits, defaultCountry);
      if (parsed && parsed.country) return parsed.number;
    } catch {
      // fall through
    }
  }

  return digits ? "+" + digits : null;
}

export function isValidPhone(raw: string, defaultCountry?: Country): boolean {
  if (!raw) return false;
  const normalized = normalizePhone(raw, defaultCountry);
  return !!normalized && isValidPhoneNumber(normalized);
}
