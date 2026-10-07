import { useCallback, useRef, useState } from "react";
import { getErrorMessage } from "../services/api";

const RESEND_COOLDOWN_MS = 30 * 1000;

/**
 * Shared two-step flow for both register and login:
 *   details  ->  request-otp  ->  otp  ->  verify-otp  ->  onVerified(result)
 *
 * @param requestOtp  (payload) => Promise<{ sessionId, expiresAt }>
 * @param verifyOtp   ({ sessionId, otp }) => Promise<result>
 * @param onVerified  (result) => void
 */
export default function useOtpFlow({ requestOtp, verifyOtp, onVerified }) {
  const [step, setStep] = useState("details"); // "details" | "otp"
  const [session, setSession] = useState(null); // { sessionId, expiresAt }
  const [resendAt, setResendAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const lastPayload = useRef(null);

  const sendCode = useCallback(
    async (payload) => {
      setLoading(true);
      setError("");
      try {
        const data = await requestOtp(payload);
        lastPayload.current = payload;
        setSession({ sessionId: data.sessionId, expiresAt: data.expiresAt });
        setResendAt(new Date(Date.now() + RESEND_COOLDOWN_MS).toISOString());
        setStep("otp");
        return true;
      } catch (err) {
        setError(getErrorMessage(err, "Couldn't send the code. Try again."));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [requestOtp]
  );

  const verify = useCallback(
    async (otp) => {
      if (!session) return false;
      setLoading(true);
      setError("");
      try {
        const result = await verifyOtp({ sessionId: session.sessionId, otp });
        onVerified(result);
        return true;
      } catch (err) {
        setError(getErrorMessage(err, "Couldn't verify the code. Try again."));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [session, verifyOtp, onVerified]
  );

  const resend = useCallback(
    () => (lastPayload.current ? sendCode(lastPayload.current) : false),
    [sendCode]
  );

  const back = useCallback(() => {
    setStep("details");
    setSession(null);
    setError("");
  }, []);

  const clearError = useCallback(() => setError(""), []);

  return {
    step,
    session,
    resendAt,
    loading,
    error,
    sendCode,
    verify,
    resend,
    back,
    clearError,
  };
}
