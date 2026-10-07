import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SESSION_EXPIRED_EVENT,
  getAccessToken,
  setAccessToken,
} from "../services/api";
import * as authService from "../services/auth.service";
import * as householdService from "../services/household.service";
import { decodeJwt } from "../utils/validators";

export const AuthContext = createContext(null);

/*
 * A non-secret flag so first-time visitors don't trigger a pointless
 * /auth/refresh (which would answer 500 "Refresh token missing").
 * The real session is the httpOnly cookie held by the browser.
 */
const SESSION_FLAG = "am.session";

const flag = {
  get: () => {
    try {
      return localStorage.getItem(SESSION_FLAG) === "1";
    } catch {
      return false;
    }
  },
  set: () => {
    try {
      localStorage.setItem(SESSION_FLAG, "1");
    } catch {
      /* ignore */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(SESSION_FLAG);
    } catch {
      /* ignore */
    }
  },
};

export function AuthProvider({ children }) {
  // "loading" while we try to restore a session on first load
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]);
  const [householdLoading, setHouseholdLoading] = useState(false);
  const booted = useRef(false);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    flag.clear();
    setUser(null);
    setHousehold(null);
    setMembers([]);
    setStatus("unauthenticated");
  }, []);

  /** Loads household + members. Returns the data so callers can use it. */
  const refreshHousehold = useCallback(async () => {
    setHouseholdLoading(true);
    try {
      const data = await householdService.getMyHousehold();
      setHousehold(data.household);
      setMembers(data.members || []);
      return data;
    } finally {
      setHouseholdLoading(false);
    }
  }, []);

  /* ---------- restore session on page load ---------- */
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    const restore = async () => {
      if (!flag.get()) {
        setStatus("unauthenticated");
        return;
      }

      try {
        const token = await authService.refresh();
        const data = await refreshHousehold();

        // /auth/refresh only returns a token, so find "me" among the members.
        const myId = decodeJwt(token)?.sub;
        const me = data.members.find((m) => m.userId?._id === myId)?.userId;

        setUser(me || { _id: myId, name: "Account" });
        setStatus("authenticated");
      } catch {
        clearSession();
      }
    };

    restore();
  }, [refreshHousehold, clearSession]);

  /* ---------- refresh token rejected while using the app ---------- */
  useEffect(() => {
    const onExpired = () => clearSession();
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [clearSession]);

  /**
   * Called by the OTP flows after verify-otp succeeds.
   * `result` is the backend payload: { user, household?, householdId?, accessToken }.
   */
  const completeAuth = useCallback(
    (result) => {
      if (result.accessToken) setAccessToken(result.accessToken);
      flag.set();
      setUser(result.user);
      if (result.household) setHousehold(result.household);
      setStatus("authenticated");
      // Register returns the household, login only its id — fetch members either way.
      refreshHousehold().catch(() => {});
    },
    [refreshHousehold]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /* even if the request fails, end the local session */
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({
      status,
      isAuthenticated: status === "authenticated",
      isLoading: status === "loading",
      user,
      household,
      members,
      householdLoading,
      hasToken: Boolean(getAccessToken()),
      completeAuth,
      refreshHousehold,
      logout,
    }),
    [
      status,
      user,
      household,
      members,
      householdLoading,
      completeAuth,
      refreshHousehold,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
