import { useState } from "react";
import { ArrowLeft, RotateCw, ShieldCheck } from "lucide-react";
import OtpInput from "../ui/OtpInput";
import Button from "../ui/Button";
import Alert from "../ui/Alert";
import useCountdown from "../../hooks/useCountdown";

const OTP_LENGTH = 6;
const RING_RADIUS = 46;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

const formatClock = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return `${m}:${s}`;
};

/**
 * Second step of register and login. The ring around the lock is the
 * code's remaining lifetime, so the deadline is visible without reading.
 *
 * Render with key={sessionId} so a fresh code resets the cells and timers.
 */
export default function OtpStep({
  destination,
  expiresAt,
  resendAt,
  loading,
  error,
  onVerify,
  onResend,
  onBack,
  backLabel,
}) {
  const [otp, setOtp] = useState("");
  const [attempt, setAttempt] = useState(0); // remounts cells after a failed try
  const code = useCountdown(expiresAt);
  const cooldown = useCountdown(resendAt);

  const canResend = cooldown.secondsLeft === 0 && !loading;
  const ready = otp.length === OTP_LENGTH && !code.expired;

  const submit = async (value) => {
    if (code.expired || value.length !== OTP_LENGTH) return;
    const ok = await onVerify(value);
    if (!ok) {
      setOtp("");
      setAttempt((n) => n + 1);
    }
  };

  const urgent = !code.expired && code.secondsLeft <= 30;

  return (
    <div className="otp-step">
      <button type="button" className="link-back" onClick={onBack}>
        <ArrowLeft size={16} />
        {backLabel}
      </button>

      <div
        className={`timer-ring ${urgent ? "timer-ring--urgent" : ""} ${
          code.expired ? "timer-ring--expired" : ""
        }`}
        role="timer"
        aria-label={
          code.expired
            ? "Code expired"
            : `Code expires in ${formatClock(code.secondsLeft)}`
        }
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="timer-ring__track" cx="50" cy="50" r={RING_RADIUS} />
          <circle
            className="timer-ring__value"
            cx="50"
            cy="50"
            r={RING_RADIUS}
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - code.progress)}
          />
        </svg>
        <span className="timer-ring__center">
          <ShieldCheck size={22} />
          <strong>{code.expired ? "Expired" : formatClock(code.secondsLeft)}</strong>
        </span>
      </div>

      <h1 className="auth-title auth-title--center">Enter your code</h1>
      <p className="auth-subtitle auth-subtitle--center">
        We sent a 6-digit code for <strong>{destination}</strong>. Check your
        email and type it below.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(otp);
        }}
      >
        <OtpInput
          key={attempt}
          value={otp}
          onChange={setOtp}
          onComplete={submit}
          disabled={loading || code.expired}
          invalid={Boolean(error)}
        />

        <div className="otp-step__feedback">
          <Alert type="error">{error}</Alert>
          {code.expired && !error && (
            <Alert type="info">This code has expired. Send a new one to continue.</Alert>
          )}
        </div>

        <Button type="submit" fullWidth loading={loading} disabled={!ready}>
          Verify and continue
        </Button>
      </form>

      <div className="otp-step__resend">
        {canResend ? (
          <Button variant="ghost" size="sm" icon={RotateCw} onClick={onResend}>
            Send a new code
          </Button>
        ) : (
          <span>
            You can request a new code in {cooldown.secondsLeft}s
          </span>
        )}
      </div>
    </div>
  );
}
