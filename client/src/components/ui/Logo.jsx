import { APP_NAME } from "../../hooks/useDocumentTitle";

export function LogoMark({ size = 36 }) {
  return (
    <svg
      className="logo__mark"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" className="logo__tile" />
      <circle
        cx="32"
        cy="32"
        r="18"
        fill="none"
        className="logo__ring"
        strokeWidth="5"
      />
      <path
        d="M32 14a18 18 0 0 1 15.6 9"
        fill="none"
        className="logo__arc"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="6" className="logo__dot" />
    </svg>
  );
}

export default function Logo({ size = 36, showName = true }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      {showName && <span className="logo__name">{APP_NAME}</span>}
    </span>
  );
}
