import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, User } from "lucide-react";
import AuthLayout from "../components/auth/AuthLayout";
import OtpStep from "../components/auth/OtpStep";
import TextField from "../components/ui/TextField";
import PhoneField from "../components/ui/PhoneField";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import useAuth from "../hooks/useAuth";
import useToast from "../hooks/useToast";
import useOtpFlow from "../hooks/useOtpFlow";
import useDocumentTitle from "../hooks/useDocumentTitle";
import {
  registerRequestOtp,
  registerVerifyOtp,
} from "../services/auth.service";
import {
  isValidEmail,
  isValidMobile,
  maskIdentifier,
  toE164,
} from "../utils/validators";

const DEFAULT_CODE = import.meta.env.VITE_DEFAULT_COUNTRY_CODE || "+91";

export default function RegisterPage() {
  useDocumentTitle("Create account");

  const { completeAuth } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    countryCode: DEFAULT_CODE,
    number: "",
  });
  const [errors, setErrors] = useState({});

  const onVerified = useCallback(
    (result) => {
      completeAuth(result);
      toast.success(`Your account is ready, ${result.user.name.split(" ")[0]}.`);
      navigate("/", { replace: true });
    },
    [completeAuth, toast, navigate]
  );

  const flow = useOtpFlow({
    requestOtp: registerRequestOtp,
    verifyOtp: registerVerifyOtp,
    onVerified,
  });

  const update = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    if (flow.error) flow.clearError();
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const mobile = toE164(form.countryCode, form.number);
    const next = {};
    if (form.name.trim().length < 2) next.name = "Enter your full name.";
    if (!isValidEmail(form.email)) next.email = "Enter a valid email address.";
    if (!isValidMobile(mobile)) {
      next.number = "Enter a valid mobile number, digits only.";
    }

    setErrors(next);
    if (Object.keys(next).length) return;

    flow.sendCode({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      mobile,
    });
  };

  return (
    <AuthLayout
      footer={
        <>
          Already registered? <Link to="/login">Sign in</Link>
        </>
      }
    >
      {flow.step === "details" ? (
        <form onSubmit={handleSubmit} noValidate>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">
            We'll send a one-time code to confirm it's you. A household is set
            up for you automatically.
          </p>

          <Alert type="error">{flow.error}</Alert>

          <TextField
            label="Full name"
            icon={User}
            value={form.name}
            onChange={(e) => update("name")(e.target.value)}
            error={errors.name}
            autoComplete="name"
            placeholder="Asha Patil"
            autoFocus
          />

          <TextField
            label="Email"
            icon={Mail}
            type="email"
            value={form.email}
            onChange={(e) => update("email")(e.target.value)}
            error={errors.email}
            autoComplete="email"
            placeholder="you@example.com"
          />

          <PhoneField
            countryCode={form.countryCode}
            number={form.number}
            onCountryChange={update("countryCode")}
            onNumberChange={update("number")}
            error={errors.number}
            placeholder="98765 43210"
          />

          <Button type="submit" fullWidth loading={flow.loading}>
            Send code
          </Button>
        </form>
      ) : (
        <OtpStep
          key={flow.session.sessionId}
          destination={maskIdentifier(form.email.trim().toLowerCase())}
          expiresAt={flow.session.expiresAt}
          resendAt={flow.resendAt}
          loading={flow.loading}
          error={flow.error}
          onVerify={flow.verify}
          onResend={flow.resend}
          onBack={flow.back}
          backLabel="Edit my details"
        />
      )}
    </AuthLayout>
  );
}
