import axios from "axios";

/*
 * Single place that knows how to talk to the backend.
 *
 *  - `api`     : authenticated client. Adds the Bearer access token and, on a
 *                401, silently refreshes the session once and retries.
 *  - `rawApi`  : same base URL + cookies, but no interceptors. Used for the
 *                auth endpoints themselves (and for /auth/refresh, to avoid
 *                an infinite refresh loop).
 *
 * The access token lives in memory only. The refresh token is an httpOnly
 * cookie set by the backend (path /api/v1/auth), so JavaScript never sees it.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

const config = {
  baseURL: API_BASE_URL,
  withCredentials: true, // required for the refresh-token cookie + backend CORS
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
};

export const rawApi = axios.create(config);
export const api = axios.create(config);

/* ---------------- access token (memory only) ---------------- */

let accessToken = null;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

export const getAccessToken = () => accessToken;

/* ---------------- session events ---------------- */

export const SESSION_EXPIRED_EVENT = "auth:session-expired";

const emitSessionExpired = () => {
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
};

/* ---------------- refresh (single-flight) ---------------- */

/*
 * The backend rotates refresh tokens: every successful /auth/refresh revokes
 * the cookie it was called with. Two refreshes in parallel (React StrictMode,
 * several 401s at once) would make the second one fail and log the user out.
 * So all callers share one in-flight request.
 */
let refreshPromise = null;

export const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = rawApi
      .post("/auth/refresh")
      .then((res) => {
        const token = res.data?.accessToken;
        if (!token) throw new Error("No access token in refresh response");
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

/* ---------------- interceptors ---------------- */

api.interceptors.request.use((request) => {
  if (accessToken) {
    request.headers.Authorization = `Bearer ${accessToken}`;
  }
  return request;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        const token = await refreshSession();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        setAccessToken(null);
        emitSessionExpired();
      }
    }

    return Promise.reject(error);
  }
);

/* ---------------- helpers ---------------- */

/** Turns any axios/network error into a message safe to show the user. */
export const getErrorMessage = (error, fallback = "Something went wrong.") => {
  if (error?.response) {
    return error.response.data?.message || fallback;
  }
  if (error?.code === "ECONNABORTED") {
    return "The server took too long to respond. Try again.";
  }
  if (error?.request) {
    return "Can't reach the server. Check that the backend is running and that FRONTEND_URL allows this site.";
  }
  return error?.message || fallback;
};
