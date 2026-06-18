/**
 * Shared, framework-agnostic field validators used across the app's forms.
 *
 * Each validator returns `null` when the value is valid, or a human-readable
 * error string when it isn't. They are pure functions (no React, no I/O) so
 * they can run on the client for instant feedback and be reused server-side.
 *
 * SECURITY NOTE: we do NOT strip "dangerous" characters here. The app talks to
 * Postgres exclusively through Supabase/PostgREST, which parameterizes every
 * query — so SQL injection is prevented at the driver level, not by mangling
 * input (which would corrupt legitimate names like O'Brien). These validators
 * are defense-in-depth: they enforce format and length caps so malformed or
 * oversized data never reaches the database or the UI.
 */

export type ValidationResult = string | null;

// Unicode-aware name: starts with a letter, then letters (any script),
// spaces, apostrophes, hyphens, periods. Covers diacritics (ă, â, î, ș, ț…).
const NAME_RE = /^[\p{L}][\p{L} .'’-]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_SHAPE_RE = /^\+?[\d\s().-]{7,20}$/;
const PASSPORT_RE = /^[A-Za-z0-9]{5,15}$/;

export function validatePersonName(value: string, field = "Name"): ValidationResult {
  const v = value.trim();
  if (!v) return `${field} is required`;
  if (v.length < 2) return `${field} must be at least 2 characters`;
  if (v.length > 50) return `${field} must be under 50 characters`;
  if (!NAME_RE.test(v)) return `${field} contains invalid characters`;
  return null;
}

export function validateEmail(value: string): ValidationResult {
  const v = value.trim();
  if (!v) return "Email is required";
  if (v.length > 254) return "Email is too long";
  if (!EMAIL_RE.test(v)) return "Enter a valid email address";
  return null;
}

export function validatePhone(value: string): ValidationResult {
  const v = value.trim();
  if (!v) return "Phone number is required";
  const digits = v.replace(/\D/g, "");
  if (!PHONE_SHAPE_RE.test(v) || digits.length < 7 || digits.length > 15) {
    return "Enter a valid phone number (7–15 digits)";
  }
  return null;
}

/** Computes integer age in whole years for a given date-of-birth + reference. */
export function ageInYears(dob: Date, ref: Date = new Date()): number {
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
  return age;
}

/**
 * Date of birth that must belong to an adult. Rejects empty, unparseable,
 * future dates, implausible ages (>120), and anyone under `minAge` (default 18).
 */
export function validateAdultDateOfBirth(value: string, minAge = 18): ValidationResult {
  if (!value) return "Date of birth is required";
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return "Enter a valid date";
  const now = new Date();
  if (dob > now) return "Date of birth can't be in the future";
  const age = ageInYears(dob, now);
  if (age > 120) return "Enter a valid date of birth";
  if (age < minAge) return `You must be at least ${minAge} years old to book`;
  return null;
}

export function validatePassport(value: string): ValidationResult {
  const v = value.trim();
  if (!v) return "Passport number is required";
  if (!PASSPORT_RE.test(v)) return "Passport must be 5–15 letters or digits";
  return null;
}

// ── Payment ──────────────────────────────────────────────────────────────

/** Luhn checksum — the standard sanity check every real card number passes. */
export function luhnValid(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export function validateCardNumber(value: string): ValidationResult {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "Card number is required";
  if (digits.length < 13 || digits.length > 19) return "Card number must be 13–19 digits";
  if (!luhnValid(digits)) return "Enter a valid card number";
  return null;
}

export function validateExpiry(value: string): ValidationResult {
  const m = value.trim().match(/^(\d{2})\/(\d{2})$/);
  if (!m) return "Use MM/YY format";
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return "Invalid month";
  // A card is valid through the last day of its expiry month.
  const endOfExpiry = new Date(year, month, 0, 23, 59, 59);
  if (endOfExpiry < new Date()) return "Card has expired";
  return null;
}

export function validateCVC(value: string): ValidationResult {
  const v = value.trim();
  if (!v) return "CVC is required";
  if (!/^\d{3,4}$/.test(v)) return "CVC must be 3 or 4 digits";
  return null;
}
