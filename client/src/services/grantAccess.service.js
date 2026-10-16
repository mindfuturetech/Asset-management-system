import { api } from "./api";

/*
 * Grant Access (protected).
 *
 *   POST {INVITATIONS_BASE}/:householdId/invitations
 *     { recipientEmail, recipientMobile, role, accessScope, personIds }
 *     -> { invitationId, status, expiresAt, devInviteUrl? }
 *
 *   POST {ACCEPT_BASE}/accept
 *     { token }
 *     -> { householdId, role, accessScope, personIds }
 *
 * Paths follow app.js (api's baseURL already supplies "/api/v1"):
 *   app.use("/api/v1/households", householdInvitationRoutes)  -> INVITATIONS_BASE = "/households"
 *   app.use("/api/v1/invitations", invitationRoutes)          -> ACCEPT_BASE      = "/invitations"
 *
 * invitation.routes.js must expose:  router.post("/accept", protect, acceptInvitation);
 */
const INVITATIONS_BASE = "/households";
const ACCEPT_BASE = "/invitations";

export const ACCESS_SCOPE = {
  ALL: "ALL_PEOPLE",
  SELECTED: "SELECTED_PEOPLE",
};

// UI label -> backend role. Order is the order shown in the dropdown.
export const INVITE_ROLES = [
  {
    value: "ADMIN",
    label: "Admin",
    description:
      "Everything a manager can do, plus invite people and manage family members.",
  },
  {
    value: "ASSET_MANAGER",
    label: "Portfolio Manager",
    description:
      "Manage portfolios, accounts and transactions, import holdings and export reports.",
  },
  {
    value: "EDITOR",
    label: "Editor",
    description: "View everything and add or update transactions.",
  },
  {
    value: "VIEWER",
    label: "Viewer",
    description: "Read-only access to portfolios, assets and reports.",
  },
];

const ROLE_LABELS = {
  OWNER: "Owner",
  ...Object.fromEntries(INVITE_ROLES.map((r) => [r.value, r.label])),
};

export const roleLabel = (role) => ROLE_LABELS[role] || role || "";

/* ---------------- send an invitation (Give Access card) ---------------- */

export const sendInvitation = async (
  householdId,
  { email, mobile, role, accessScope, personIds },
) => {
  const { data } = await api.post(
    `${INVITATIONS_BASE}/${householdId}/invitations`,
    {
      recipientEmail: email?.trim() || "",
      recipientMobile: mobile?.trim() || "",
      role,
      accessScope,
      personIds: accessScope === ACCESS_SCOPE.SELECTED ? personIds : [],
    },
  );
  return data.data;
};

/* ---------------- accept an invitation (/accept-invitation page) ---------------- */

/*
 * The invitee must be logged in. The token comes from the emailed link:
 *   http://localhost:5173/accept-invitation?token=...
 *
 * Call this from a button click, NOT automatically in useEffect: React
 * StrictMode runs effects twice in dev, and the first call would consume the
 * token so the second would fail with "already used".
 */
export const acceptInvitation = async (token) => {
  const { data } = await api.post(`${ACCEPT_BASE}/accept`, { token });
  return data.data;
};

/*
 * The access token lives in memory only, so a redirect to /login would lose
 * the ?token=. Stash it here before redirecting, and read it back after login.
 */
const PENDING_TOKEN_KEY = "pending_invitation_token";

export const savePendingInvitationToken = (token) => {
  try {
    sessionStorage.setItem(PENDING_TOKEN_KEY, token);
  } catch {
    /* storage unavailable - the user can reopen the email link */
  }
};

export const getPendingInvitationToken = () => {
  try {
    return sessionStorage.getItem(PENDING_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const clearPendingInvitationToken = () => {
  try {
    sessionStorage.removeItem(PENDING_TOKEN_KEY);
  } catch {
    /* ignore */
  }
};
