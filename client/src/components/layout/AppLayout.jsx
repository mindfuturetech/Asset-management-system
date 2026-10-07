import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, LogOut, Users } from "lucide-react";
import Logo from "../ui/Logo";
import Avatar from "../ui/Avatar";
import ThemeToggle from "../ui/ThemeToggle";
import useAuth from "../../hooks/useAuth";
import useToast from "../../hooks/useToast";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/people", label: "People", icon: Users },
];

export default function AppLayout() {
  const { user, household, logout } = useAuth();
  const toast = useToast();

  const handleLogout = async () => {
    await logout();
    toast.info("You've been signed out.");
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__logo">
          <Logo />
        </div>

        <nav className="sidebar__nav" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link--active" : ""}`
              }
            >
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__user">
          <Avatar name={user?.name} size={40} />
          <div className="sidebar__user-text">
            <strong>{user?.name}</strong>
            <span>{household?.name || user?.email}</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="shell__main">
        <header className="topbar">
          <div className="topbar__logo">
            <Logo size={30} />
          </div>
          <div className="topbar__spacer" />
          <ThemeToggle />
          <button
            type="button"
            className="icon-btn topbar__logout"
            onClick={handleLogout}
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <nav className="tabbar" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `tabbar__link ${isActive ? "tabbar__link--active" : ""}`
            }
          >
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
