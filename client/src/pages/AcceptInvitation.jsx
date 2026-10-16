import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Mail, ShieldCheck, X } from "lucide-react";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import useAuth from "../hooks/useAuth";
import useDocumentTitle from "../hooks/useDocumentTitle";
import {
    ACCESS_SCOPE,
    acceptInvitation,
    clearPendingInvitationToken,
    roleLabel,
    savePendingInvitationToken,
} from "../services/grantAccess.service";
import { getErrorMessage } from "../services/api";
import "../styles/acceptinvitation.css";

// Edit these if your router uses different paths.
const ROUTES = { login: "/login", register: "/register", home: "/dashboard" };

function Notice({ icon: Icon, tone, title, children }) {
    return (
        <>
            <span className={`ai-icon ai-icon--${tone}`}>
                <Icon size={22} />
            </span>
            <h1>{title}</h1>
            {children}
        </>
    );
}

export default function AcceptInvitationPage() {
    useDocumentTitle("Accept invitation");

    const navigate = useNavigate();
    const [params] = useSearchParams();
    const token = params.get("token") || "";

    // `loading` is assumed to be your AuthContext's "restoring session" flag.
    // If it has another name, rename it here; without it the page simply
    // flips from the sign-in prompt to the accept button once the user loads.
    const { user, loading: authLoading = false, refreshHousehold } = useAuth();

    const [status, setStatus] = useState("idle"); // idle | accepting | success | error
    const [error, setError] = useState("");
    const [retryable, setRetryable] = useState(false);
    const [result, setResult] = useState(null);

    // Keep the token across login / registration (the access token is memory-only,
    // so a redirect would otherwise lose it). PendingInvitationRedirect reads it back.
    useEffect(() => {
        if (token && !user) savePendingInvitationToken(token);
    }, [token, user]);

    const leave = () => {
        clearPendingInvitationToken();
        navigate(ROUTES.home, { replace: true });
    };

    // Called from a click, never from an effect: StrictMode would run an effect
    // twice and the first call would use up the token.
    const handleAccept = async () => {
        setStatus("accepting");
        setError("");
        try {
            const data = await acceptInvitation(token);
            clearPendingInvitationToken();
            setResult(data);
            setStatus("success");
            refreshHousehold?.().catch(() => { });
        } catch (err) {
            const httpStatus = err?.response?.status;
            // 4xx = the invitation itself is the problem (invalid, used, wrong account).
            // Network errors and 5xx are worth retrying.
            const terminal = Boolean(httpStatus && httpStatus < 500 && httpStatus !== 401);
            if (terminal) clearPendingInvitationToken();
            setRetryable(!terminal);
            setError(getErrorMessage(err, "Couldn't accept this invitation."));
            setStatus("error");
        }
    };

    let body;

    if (!token) {
        body = (
            <Notice icon={X} tone="error" title="This link is incomplete">
                <p className="ai-muted">Open the link from your invitation email again.</p>
                <div className="ai-actions">
                    <Button onClick={() => navigate(ROUTES.login)}>Go to sign in</Button>
                </div>
            </Notice>
        );
    } else if (authLoading) {
        body = <p className="ai-muted">Checking your session…</p>;
    } else if (!user) {
        body = (
            <Notice icon={Mail} tone="info" title="You've been invited">
                <p className="ai-muted">
                    Sign in, or create an account, with the email or mobile number this
                    invitation was sent to. You'll come back here to accept it.
                </p>
                <div className="ai-actions">
                    <Button onClick={() => navigate(ROUTES.login)}>Sign in</Button>
                    <Button variant="secondary" onClick={() => navigate(ROUTES.register)}>
                        Create account
                    </Button>
                </div>
            </Notice>
        );
    } else if (status === "success") {
        const scope =
            result?.accessScope === ACCESS_SCOPE.ALL
                ? "All family members"
                : `${result?.personIds?.length ?? 0} selected`;
        body = (
            <Notice icon={Check} tone="success" title="You now have access">
                <dl className="ai-details">
                    <div>
                        <dt>Role</dt>
                        <dd>{roleLabel(result?.role)}</dd>
                    </div>
                    <div>
                        <dt>Family access</dt>
                        <dd>{scope}</dd>
                    </div>
                </dl>
                <div className="ai-actions">
                    <Button onClick={leave}>Go to dashboard</Button>
                </div>
            </Notice>
        );
    } else {
        const canAccept = status !== "error" || retryable;
        body = (
            <Notice icon={ShieldCheck} tone="info" title="Accept invitation">
                <p className="ai-muted">
                    You've been invited to access a household. Accepting adds it to your
                    account. You must be signed in with the email or mobile number the
                    invitation was sent to.
                </p>
                <Alert type="error">{error}</Alert>
                <div className="ai-actions">
                    {canAccept && (
                        <Button loading={status === "accepting"} onClick={handleAccept}>
                            {status === "error" ? "Try again" : "Accept invitation"}
                        </Button>
                    )}
                    <Button variant="ghost" onClick={leave}>
                        {canAccept ? "Not now" : "Go to dashboard"}
                    </Button>
                </div>
            </Notice>
        );
    }

    return (
        <main className="ai-page">
            <div className="ai-card">{body}</div>
        </main>
    );
}