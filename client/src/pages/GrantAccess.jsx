import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Mail, Phone, Plus, Send, ShieldCheck, UserCheck } from "lucide-react";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import TextField from "../components/ui/TextField";
import EmptyState from "../components/ui/EmptyState";
import Alert from "../components/ui/Alert";
import useAuth from "../hooks/useAuth";
import useToast from "../hooks/useToast";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useFamilyMembers from "../hooks/useFamilyMembers";
import {
    ACCESS_SCOPE,
    INVITE_ROLES,
    getMyAccess,
    roleLabel,
    sendInvitation,
} from "../services/grantAccess.service";
import { getErrorMessage } from "../services/api";
import { formatDate, titleCase } from "../utils/validators";
import "../styles/grantaccess.css";

const EMPTY_FORM = {
    email: "",
    mobile: "",
    role: "VIEWER", // least privilege by default
    scope: ACCESS_SCOPE.ALL,
    personIds: [],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^\+?\d{10,15}$/;

function scopeText(access) {
    if (access?.accessScope === ACCESS_SCOPE.ALL) return "All family";
    if (access?.accessScope === ACCESS_SCOPE.SELECTED) {
        const n = access.personIds?.length ?? 0;
        return `${n} ${n === 1 ? "person" : "people"}`;
    }
    return "";
}

// Line under a household's name in My Access: who shared it and which family it covers.
// `knownNames` = the family members we already have loaded for this household
// (my-access returns no names for ALL_PEOPLE).
function accessSummary(h, knownNames = []) {
    const scope =
        h.accessScope === ACCESS_SCOPE.ALL
            ? knownNames.length
                ? `All family: ${knownNames.join(", ")}`
                : "All family members"
            : h.people?.map((p) => p.name).filter(Boolean).join(", ") || "Selected family members";
    return h.sharedBy?.name ? `Shared by ${h.sharedBy.name} · ${scope}` : scope;
}

function ListSkeleton() {
    return (
        <ul className="list">
            {[0, 1].map((i) => (
                <li key={i} className="list__row">
                    <span className="skeleton skeleton--avatar" />
                    <span className="skeleton skeleton--line" />
                </li>
            ))}
        </ul>
    );
}

export default function GrantAccess() {
    useDocumentTitle("Grant Access");

    const toast = useToast();
    const { user, household, members, householdLoading } = useAuth();
    const householdId = household?._id ?? household?.id;

    const {
        familyMembers,
        loading: familyLoading,
        error: familyError,
        reload: reloadFamily,
    } = useFamilyMembers(householdId);

    const [inviteOpen, setInviteOpen] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState("");
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);

    // Every household I belong to, mine included (GET /households/my-access).
    const [myAccess, setMyAccess] = useState([]);
    const [accessLoading, setAccessLoading] = useState(true);
    const [accessError, setAccessError] = useState("");
    const [accessReloadKey, setAccessReloadKey] = useState(0);

    const loading = householdLoading && !household;

    const userId = user?._id;

    useEffect(() => {
        if (!userId) return undefined; // session still restoring - stay in the loading state

        let active = true;
        setAccessLoading(true);
        setAccessError("");

        getMyAccess()
            .then((data) => {
                if (active) setMyAccess(data);
            })
            .catch((err) => {
                if (active) setAccessError(getErrorMessage(err, "Couldn't load your access."));
            })
            .finally(() => {
                if (active) setAccessLoading(false);
            });

        return () => {
            active = false;
        };
    }, [userId, accessReloadKey]);

    /* ---------- who has what ---------- */

    const myMembership = members.find((m) => m.userId?._id === user?._id);
    const myRole = myMembership?.role;
    const canInvite = myRole === "OWNER" || myRole === "ADMIN";

    // An Admin cannot appoint another Admin (the backend enforces this too).
    const roleOptions = INVITE_ROLES.filter(
        (r) => !(myRole === "ADMIN" && r.value === "ADMIN")
    );
    const selectedRole = roleOptions.find((r) => r.value === form.role);

    // My Access: my own household (role Owner) first, then households shared with me.
    const myAccessList = [...myAccess].sort(
        (a, b) => Number(b.role === "OWNER") - Number(a.role === "OWNER")
    );

    // Access given: people I have given access to.
    const accessGiven = members.filter((m) => m.userId && m.userId._id !== user?._id);

    /* ---------- invite modal ---------- */

    const openInvite = () => setInviteOpen(true);

    const closeInvite = useCallback(() => {
        setInviteOpen(false);
        setForm(EMPTY_FORM);
        setFormError("");
        setResult(null);
        setCopied(false);
    }, []);

    const inviteAnother = () => {
        setResult(null);
        setCopied(false);
    };

    const setField = (name, value) => {
        setForm((f) => ({ ...f, [name]: value }));
        setFormError("");
    };

    const togglePerson = (id) =>
        setField(
            "personIds",
            form.personIds.includes(id)
                ? form.personIds.filter((p) => p !== id)
                : [...form.personIds, id]
        );

    const selectAll = () => setField("personIds", familyMembers.map((p) => p._id));
    const clearAll = () => setField("personIds", []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setResult(null);
        setCopied(false);

        const email = form.email.trim();
        const mobile = form.mobile.replace(/[\s-]/g, "");

        if (!email && !mobile) return setFormError("Enter an email or a mobile number.");
        if (email && !EMAIL_RE.test(email)) return setFormError("Enter a valid email address.");
        if (mobile && !MOBILE_RE.test(mobile)) {
            return setFormError("Enter a valid mobile number (10–15 digits, optional + prefix).");
        }
        if (form.scope === ACCESS_SCOPE.SELECTED && form.personIds.length === 0) {
            return setFormError("Select at least one family member.");
        }
        if (!householdId) return setFormError("We couldn't find your household. Please sign in again.");

        setSending(true);
        setFormError("");
        try {
            const res = await sendInvitation(householdId, {
                email,
                mobile,
                role: form.role,
                accessScope: form.scope,
                personIds: form.personIds,
            });
            setResult(res); // switches the modal to its success view
            toast.success(`Invitation created for ${email || mobile}.`);
            setForm(EMPTY_FORM);
        } catch (err) {
            setFormError(getErrorMessage(err, "Couldn't send this invitation."));
        } finally {
            setSending(false);
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(result.devInviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* clipboard unavailable - the link is still visible to copy by hand */
        }
    };

    /* ---------- render ---------- */

    return (
        <div className="page grant-access-page">
            <header className="page__header">
                <div>
                    <h1>Grant Access</h1>
                    <p>Decide who can see and manage your household's assets.</p>
                </div>
                <Button icon={Plus} onClick={openInvite} disabled={loading}>
                    Invite
                </Button>
            </header>

            <div className="ga-grid">
                {/* My access */}
                <section className="panel" aria-labelledby="ga-mine-title">
                    <div className="panel__header">
                        <div>
                            <h2 id="ga-mine-title" className="ga-title">
                                My access
                                <span className="ga-count">{accessLoading ? "–" : myAccessList.length}</span>
                            </h2>
                            <p className="ga-sub">Your household and any shared with you.</p>
                        </div>
                    </div>

                    {accessLoading ? (
                        <ListSkeleton />
                    ) : accessError ? (
                        <EmptyState
                            icon={ShieldCheck}
                            title="Couldn't load your access"
                            description={accessError}
                            action={
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setAccessReloadKey((k) => k + 1)}
                                >
                                    Try again
                                </Button>
                            }
                        />
                    ) : myAccessList.length === 0 ? (
                        <EmptyState
                            icon={ShieldCheck}
                            title="No access yet"
                            description="Your household and any household shared with you will show up here."
                        />
                    ) : (
                        <ul className="list">
                            {myAccessList.map((h) => {
                                const isOwn = h.role === "OWNER";
                                const isActive = String(h.householdId) === String(householdId);
                                const knownNames = isActive ? familyMembers.map((p) => p.name) : [];
                                return (
                                    <li key={h.householdId} className="list__row">
                                        <Avatar name={h.householdName || "Household"} size={42} />
                                        <div className="list__main">
                                            <strong>
                                                {h.householdName || "Household"}
                                                {isOwn ? (
                                                    <span className="tag tag--you">Yours</span>
                                                ) : (
                                                    isActive && <span className="tag tag--you">Current</span>
                                                )}
                                            </strong>
                                            <span>{accessSummary(h, knownNames)}</span>
                                        </div>
                                        <span className="tag">{roleLabel(h.role)}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                {/* Access given */}
                <section className="panel" aria-labelledby="ga-given-title">
                    <div className="panel__header">
                        <div>
                            <h2 id="ga-given-title" className="ga-title">
                                Access given
                                <span className="ga-count">{loading ? "–" : accessGiven.length}</span>
                            </h2>
                            <p className="ga-sub">People you have given access to.</p>
                        </div>
                    </div>

                    {loading ? (
                        <ListSkeleton />
                    ) : accessGiven.length === 0 ? (
                        <EmptyState
                            icon={UserCheck}
                            title="No one yet"
                            description="Invite someone and they will appear here once they accept."
                            action={
                                <Button icon={Plus} onClick={openInvite}>
                                    Invite
                                </Button>
                            }
                        />
                    ) : (
                        <ul className="list">
                            {accessGiven.map((m) => (
                                <li key={m._id} className="list__row">
                                    <Avatar name={m.userId.name || m.userId.email || "User"} size={42} />
                                    <div className="list__main">
                                        <strong>{m.userId.name || "Unnamed"}</strong>
                                        <span>{m.userId.email || m.userId.mobile}</span>
                                    </div>
                                    {scopeText(m) && <span className="tag">{scopeText(m)}</span>}
                                    <span className="tag">{roleLabel(m.role)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {/* Invite modal */}
            <Modal
                open={inviteOpen}
                title={result ? "Invitation created" : "Invite someone"}
                onClose={closeInvite}
            >
                {result ? (
                    <div className="modal__form ga-modal-form">
                        <Alert type="success">
                            Invitation created. It expires on {formatDate(result.expiresAt)}.
                        </Alert>
                        {result.devInviteUrl && (
                            <div className="ga-devlink">
                                <code title={result.devInviteUrl}>{result.devInviteUrl}</code>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={copied ? Check : Copy}
                                    onClick={copyLink}
                                >
                                    {copied ? "Copied" : "Copy link"}
                                </Button>
                            </div>
                        )}
                        <div className="modal__actions">
                            <Button variant="ghost" onClick={inviteAnother}>
                                Invite another
                            </Button>
                            <Button onClick={closeInvite}>Done</Button>
                        </div>
                    </div>
                ) : (
                    <form className="modal__form ga-modal-form" onSubmit={handleSubmit} noValidate>
                        {!loading && !canInvite && (
                            <Alert type="error">Only the owner or an admin can invite people.</Alert>
                        )}
                        <Alert type="error">{formError}</Alert>

                        <fieldset className="ga-lock" disabled={loading || !canInvite || sending}>
                            <TextField
                                label="Email"
                                type="email"
                                icon={Mail}
                                value={form.email}
                                onChange={(e) => setField("email", e.target.value)}
                                placeholder="name@example.com"
                                autoComplete="off"
                            />

                            <TextField
                                label="Mobile number"
                                type="tel"
                                icon={Phone}
                                value={form.mobile}
                                onChange={(e) => setField("mobile", e.target.value)}
                                placeholder="9876543210"
                                autoComplete="off"
                                hint="Enter an email, a mobile number, or both. If you enter both, the invitee's account must match both. Use the same format they registered with."
                            />

                            <div className="field">
                                <label className="field__label" htmlFor="ga-role">
                                    Role
                                </label>
                                <div className="field__control">
                                    <select
                                        id="ga-role"
                                        className="field__input field__input--select"
                                        value={form.role}
                                        onChange={(e) => setField("role", e.target.value)}
                                    >
                                        {roleOptions.map((r) => (
                                            <option key={r.value} value={r.value}>
                                                {r.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {selectedRole && <p className="ga-hint">{selectedRole.description}</p>}
                            </div>

                            <div className="ga-scope" role="radiogroup" aria-label="Family access">
                                <p className="field__label">Family access</p>

                                <label
                                    className={`ga-option ${form.scope === ACCESS_SCOPE.ALL ? "ga-option--active" : ""}`}
                                >
                                    <input
                                        type="radio"
                                        name="scope"
                                        value={ACCESS_SCOPE.ALL}
                                        checked={form.scope === ACCESS_SCOPE.ALL}
                                        onChange={() => setField("scope", ACCESS_SCOPE.ALL)}
                                    />
                                    <span>
                                        <strong>All access</strong>
                                        <span>Everyone in your family, including people added later.</span>
                                    </span>
                                </label>

                                <label
                                    className={`ga-option ${form.scope === ACCESS_SCOPE.SELECTED ? "ga-option--active" : ""}`}
                                >
                                    <input
                                        type="radio"
                                        name="scope"
                                        value={ACCESS_SCOPE.SELECTED}
                                        checked={form.scope === ACCESS_SCOPE.SELECTED}
                                        onChange={() => setField("scope", ACCESS_SCOPE.SELECTED)}
                                    />
                                    <span>
                                        <strong>Selected family members</strong>
                                        <span>Choose exactly whose assets they can see.</span>
                                    </span>
                                </label>

                                {form.scope === ACCESS_SCOPE.SELECTED && (
                                    <div className="ga-picker">
                                        {familyLoading ? (
                                            <ListSkeleton />
                                        ) : familyError ? (
                                            <div className="page__alert">
                                                <Alert type="error">{familyError}</Alert>
                                                <Button variant="secondary" size="sm" onClick={reloadFamily}>
                                                    Try again
                                                </Button>
                                            </div>
                                        ) : familyMembers.length === 0 ? (
                                            <p className="ga-hint">
                                                There are no family members yet. Add them on the{" "}
                                                <Link to="/people">Family page</Link> first.
                                            </p>
                                        ) : (
                                            <>
                                                <div className="ga-checklist" role="group" aria-label="Family members">
                                                    {familyMembers.map((p) => (
                                                        <label key={p._id} className="ga-check">
                                                            <input
                                                                type="checkbox"
                                                                checked={form.personIds.includes(p._id)}
                                                                onChange={() => togglePerson(p._id)}
                                                            />
                                                            <Avatar name={p.name} size={32} />
                                                            <span className="ga-check__text">
                                                                <strong>{p.name}</strong>
                                                                <span>
                                                                    {p.relationship === "SELF"
                                                                        ? "You"
                                                                        : p.relationship
                                                                            ? titleCase(p.relationship)
                                                                            : "Family member"}
                                                                </span>
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                                <div className="ga-picker__bar">
                                                    <span>
                                                        {form.personIds.length} of {familyMembers.length} selected
                                                    </span>
                                                    <span className="ga-picker__actions">
                                                        <Button variant="ghost" size="sm" onClick={selectAll}>
                                                            Select all
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={clearAll}>
                                                            Clear
                                                        </Button>
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </fieldset>

                        <div className="modal__actions">
                            <Button variant="ghost" onClick={closeInvite}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                icon={Send}
                                loading={sending}
                                disabled={loading || !canInvite}
                            >
                                Send invitation
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}