import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout";
import OtpStep from "../components/auth/OtpStep";
import TextField from "../components/ui/TextField";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import useAuth from "../hooks/useAuth";
import useToast from "../hooks/useToast";
import useOtpFlow from "../hooks/useOtpFlow";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { loginRequestOtp, loginVerifyOtp } from "../services/auth.service";
import { isValidLogin, maskIdentifier, normalizeLogin } from "../utils/validators";

export default function LoginPage() {
  useDocumentTitle("Sign in");

  const { completeAuth } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/";

  const [login, setLogin] = useState("");
  const [fieldError, setFieldError] = useState("");

  const onVerified = useCallback(
    (result) => {
      completeAuth(result);
      toast.success(`Welcome back, ${result.user.name.split(" ")[0]}.`);
      navigate(redirectTo, { replace: true });
    },
    [completeAuth, toast, navigate, redirectTo]
  );

  const flow = useOtpFlow({
    requestOtp: loginRequestOtp,
    verifyOtp: loginVerifyOtp,
    onVerified,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValidLogin(login)) {
      setFieldError(
        "Enter the email you registered with, or your mobile number with country code (for example +919876543210)."
      );
      return;
    }
    setFieldError("");
    flow.sendCode({ login: normalizeLogin(login) });
  };

  return (
    <AuthLayout
      footer={
        <>
          New here? <Link to="/register">Create an account</Link>
        </>
      }
    >
      {flow.step === "details" ? (
        <form onSubmit={handleSubmit} noValidate>
          <h1 className="auth-title">Sign in</h1>
          <p className="auth-subtitle">
            Enter your email or mobile number and we'll send you a one-time
            code.
          </p>

          <Alert type="error">{flow.error}</Alert>

          <TextField
            label="Email or mobile number"
            icon={User}
            value={login}
            onChange={(e) => {
              setLogin(e.target.value);
              if (fieldError) setFieldError("");
              if (flow.error) flow.clearError();
            }}
            error={fieldError}
            placeholder="you@example.com or +919876543210"
            autoComplete="username"
            autoFocus
          />

          <Button type="submit" fullWidth loading={flow.loading}>
            Send code
          </Button>
        </form>
      ) : (
        <OtpStep
          key={flow.session.sessionId}
          destination={maskIdentifier(normalizeLogin(login))}
          expiresAt={flow.session.expiresAt}
          resendAt={flow.resendAt}
          loading={flow.loading}
          error={flow.error}
          onVerify={flow.verify}
          onResend={flow.resend}
          onBack={flow.back}
          backLabel="Use a different email or number"
        />
      )}
    </AuthLayout>
  );
}
