import { rawApi, refreshSession, setAccessToken } from "./api";

/*
 * Auth module — one function per backend endpoint.
 *
 *   POST /auth/register/request-otp   { name, email, mobile }  -> { sessionId, expiresAt }
 *   POST /auth/register/verify-otp    { sessionId, otp }       -> { user, household, person, accessToken }
 *   POST /auth/login/request-otp      { login }                -> { sessionId, expiresAt }
 *   POST /auth/login/verify-otp       { sessionId, otp }       -> { user, householdId, accessToken }
 *   POST /auth/refresh                (cookie)                 -> { accessToken }
 *   POST /auth/logout                 (cookie)
 *
 * Every success body looks like { success: true, message, data }.
 */

/* ---------------- register ---------------- */

export const registerRequestOtp = async ({ name, email, mobile }) => {
  const { data } = await rawApi.post("/auth/register/request-otp", {
    name,
    email,
    mobile,
  });
  console.log(`Register OTP requested for ${email}. Session ID: ${data.data.sessionId}, Expires at: ${data.data.expiresAt}`);
  return data.data; // { sessionId, expiresAt }
};

export const registerVerifyOtp = async ({ sessionId, otp }) => {
  const { data } = await rawApi.post("/auth/register/verify-otp", {
    sessionId,
    otp,
  });
  setAccessToken(data.data.accessToken);
  console.log(`Register OTP verified for session ${sessionId}. User: ${data.data.user.email}`);
  return data.data; // { user, household, person, accessToken }
};

/* ---------------- login ---------------- */

export const loginRequestOtp = async ({ login }) => {
  const { data } = await rawApi.post("/auth/login/request-otp", { login });
  console.log(`Login OTP requested for ${login}. Session ID: ${data.data.sessionId}, Expires at: ${data.data.expiresAt}`);
  return data.data; // { sessionId, expiresAt }
};

export const loginVerifyOtp = async ({ sessionId, otp }) => {
  const { data } = await rawApi.post("/auth/login/verify-otp", {
    sessionId,
    otp,
  });
  setAccessToken(data.data.accessToken);
  console.log(`Login OTP verified for session ${sessionId}. User: ${data.data.user.email}, Household ID: ${data.data.householdId}`);
  return data.data; // { user, householdId, accessToken }
};

/* ---------------- session ---------------- */

/** Uses the httpOnly refresh cookie to get a new access token. */
export const refresh = () => refreshSession();

export const logout = async () => {
  try {
    await rawApi.post("/auth/logout");
    console.log("Logout request sent to server.");
  } finally {
    console.log("Clearing access token on client side.");
    setAccessToken(null);
  }
};
