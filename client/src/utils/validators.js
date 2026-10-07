/*
 * Client-side checks that mirror the backend rules in auth.service.js,
 * so people get feedback before a request is sent.
 */

const DEFAULT_COUNTRY_CODE = import.meta.env.VITE_DEFAULT_COUNTRY_CODE || "+91";

// Backend: /^\+[1-9]\d{7,14}$/
export const isValidMobile = (value) => /^\+[1-9]\d{7,14}$/.test(value);

export const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export const COUNTRY_CODES = [
  { code: "+91", label: "India", flag: "🇮🇳" },
  { code: "+1", label: "United States / Canada", flag: "🇺🇸" },
  { code: "+44", label: "United Kingdom", flag: "🇬🇧" },
  { code: "+971", label: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+65", label: "Singapore", flag: "🇸🇬" },
  { code: "+61", label: "Australia", flag: "🇦🇺" },
  { code: "+49", label: "Germany", flag: "🇩🇪" },
  { code: "+33", label: "France", flag: "🇫🇷" },
  { code: "+81", label: "Japan", flag: "🇯🇵" },
  { code: "+966", label: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", label: "Qatar", flag: "🇶🇦" },
  { code: "+27", label: "South Africa", flag: "🇿🇦" },
];

/** Joins a dial code and a local number into +E.164 form. */
export const toE164 = (countryCode, number) =>
  `${countryCode}${String(number).replace(/\D/g, "")}`;

/**
 * Login accepts an email or a mobile number. The backend matches a mobile
 * exactly as stored (+E.164), so tidy up what the person typed.
 */
export const normalizeLogin = (value) => {
  const trimmed = value.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();

  const compact = trimmed.replace(/[\s\-().]/g, "");
  if (compact.startsWith("+")) return compact;
  if (/^\d{10}$/.test(compact)) return `${DEFAULT_COUNTRY_CODE}${compact}`;
  return compact;
};

export const isValidLogin = (value) => {
  const normalized = normalizeLogin(value);
  return normalized.includes("@")
    ? isValidEmail(normalized)
    : isValidMobile(normalized);
};

/** a***@gmail.com  /  +91•••••••210 */
export const maskIdentifier = (value = "") => {
  if (value.includes("@")) {
    const [user, domain] = value.split("@");
    return `${user.slice(0, 1)}${"•".repeat(Math.max(user.length - 1, 2))}@${domain}`;
  }
  if (value.length > 6) {
    return `${value.slice(0, 3)}${"•".repeat(value.length - 6)}${value.slice(-3)}`;
  }
  return value;
};

export const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

export const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const titleCase = (value = "") =>
  value
    ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
    : "";

/** Reads the payload of a JWT without verifying it (display purposes only). */
export const decodeJwt = (token) => {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};
