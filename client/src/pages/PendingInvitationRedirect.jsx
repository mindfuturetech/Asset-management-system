import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { getPendingInvitationToken } from "../services/grantAccess.service";

/*
 * Render once, anywhere inside <BrowserRouter> and <AuthProvider> (e.g. just
 * above <Routes> in App.jsx).
 *
 * If someone opened an invitation link while signed out, the page saved the
 * token. As soon as they are signed in - by logging in OR by registering -
 * this sends them back to the accept page. The accept page clears the token
 * when they accept, hit a final error, or choose "Not now", so this can't loop.
 */
export default function PendingInvitationRedirect() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const token = user ? getPendingInvitationToken() : null;

  if (token && pathname !== "/accept-invitation") {
    return <Navigate to={`/accept-invitation?token=${encodeURIComponent(token)}`} replace />;
  }
  return null;
}