import { Link } from "react-router-dom";
import { KeyRound, Users, Vault } from "lucide-react";
import Logo from "../ui/Logo";
import ThemeToggle from "../ui/ThemeToggle";

const POINTS = [
  {
    icon: KeyRound,
    title: "No passwords to remember",
    text: "Sign in with a one-time code sent to you.",
  },
  {
    icon: Users,
    title: "Built for the whole household",
    text: "Add the people whose assets you look after.",
  },
  {
    icon: Vault,
    title: "One home for everything",
    text: "Your family's details stay in a single, private workspace.",
  },
];

/** Rings echo the countdown ring on the code screen. */
function Rings() {
  return (
    <svg className="brand-rings" viewBox="0 0 400 400" aria-hidden="true">
      <circle cx="200" cy="200" r="60" />
      <circle cx="200" cy="200" r="110" />
      <circle cx="200" cy="200" r="160" />
      <circle cx="200" cy="200" r="195" />
      <path className="brand-rings__arc" d="M200 40a160 160 0 0 1 138 80" />
      <circle className="brand-rings__dot" cx="338" cy="120" r="7" />
    </svg>
  );
}

export default function AuthLayout({ children, footer }) {
  return (
    <div className="auth">
      <aside className="auth__brand">
        <Rings />
        <Link to="/login" className="auth__brand-logo" aria-label="Home">
          <Logo size={40} />
        </Link>

        <div className="auth__brand-body">
          <h2>Everything your family owns, in one place.</h2>
          <ul>
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span className="auth__point-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="auth__main">
        <div className="auth__topbar">
          <Link to="/login" className="auth__mobile-logo" aria-label="Home">
            <Logo size={32} />
          </Link>
          <ThemeToggle />
        </div>

        <div className="auth__card">{children}</div>

        {footer && <p className="auth__footer">{footer}</p>}
      </main>
    </div>
  );
}
