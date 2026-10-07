import { Link } from "react-router-dom";
import Logo from "../components/ui/Logo";
import ThemeToggle from "../components/ui/ThemeToggle";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Page not found");

  return (
    <div className="not-found">
      <div className="not-found__top">
        <Logo />
        <ThemeToggle />
      </div>
      <div className="not-found__body">
        <p className="not-found__code">404</p>
        <h1>This page doesn't exist</h1>
        <p>The link may be broken, or the page may have moved.</p>
        <Link to="/" className="btn btn--primary">
          <span>Go to dashboard</span>
        </Link>
      </div>
    </div>
  );
}
