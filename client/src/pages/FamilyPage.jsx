import { useCallback, useEffect, useState } from "react";
import { Cake, Plus, User, Users } from "lucide-react";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import TextField from "../components/ui/TextField";
import EmptyState from "../components/ui/EmptyState";
import Alert from "../components/ui/Alert";
import useAuth from "../hooks/useAuth";
import useToast from "../hooks/useToast";
import useDocumentTitle from "../hooks/useDocumentTitle";
import {
  createFamilyMember,
  getFamilyMembers,
} from "../services/family.service";
import { getErrorMessage } from "../services/api";
import { formatDate, titleCase } from "../utils/validators";

const RELATIONSHIPS = [
  "SPOUSE",
  "SON",
  "DAUGHTER",
  "FATHER",
  "MOTHER",
  "BROTHER",
  "SISTER",
  "OTHER",
];

const EMPTY_FORM = { name: "", relationship: "", dateOfBirth: "" };

export default function FamilyPage() {
  useDocumentTitle("Family");

  const { household, refreshHousehold } = useAuth();
  const householdId = household?._id ?? household?.id;

  const toast = useToast();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // The household may still be loading from the auth context.
    if (!householdId) {
      setLoading(false);
      setLoadError("We couldn't find your household. Please sign in again.");
      return undefined;
    }

    let active = true;
    setLoading(true);
    setLoadError("");

    getFamilyMembers(householdId)
      .then((data) => {
        console.log("Family members:", data);
        if (active) setMembers(data);
      })
      .catch((err) => {
        if (active)
          setLoadError(
            getErrorMessage(err, "Couldn't load your family members.")
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [householdId, reloadKey]);

  const retry = () => setReloadKey((k) => k + 1);

  const closeModal = useCallback(() => {
    setOpen(false);
    setForm(EMPTY_FORM);
    setFormError("");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError("Enter a name.");
      return;
    }
    if (!householdId) {
      setFormError("We couldn't find your household. Please sign in again.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const member = await createFamilyMember(householdId, {
        name: form.name.trim(),
        relationship: form.relationship,
        dateOfBirth: form.dateOfBirth,
      });
      setMembers((current) => [...current, member]);
      refreshHousehold?.().catch(() => { }); // keep the dashboard in step
      toast.success(`${member.name} added.`);
      closeModal();
    } catch (err) {
      setFormError(getErrorMessage(err, "Couldn't add this family member."));
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Family</h1>
          <p>Everyone in your household whose assets you manage.</p>
        </div>
        <Button icon={Plus} onClick={() => setOpen(true)} disabled={!householdId}>
          Add family member
        </Button>
      </header>

      {loadError && (
        <div className="page__alert">
          <Alert type="error">{loadError}</Alert>
          {householdId && (
            <Button variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="member-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="member-card">
              <span className="skeleton skeleton--avatar" />
              <span className="skeleton skeleton--line" />
            </div>
          ))}
        </div>
      ) : members.length === 0 && !loadError ? (
        <section className="panel">
          <EmptyState
            icon={Users}
            title="No family members yet"
            description="Add a family member to start organising their assets."
            action={
              <Button icon={Plus} onClick={() => setOpen(true)}>
                Add family member
              </Button>
            }
          />
        </section>
      ) : (
        <div className="member-grid">
          {members.map((member) => (
            <article key={member._id} className="member-card">
              <Avatar name={member.name} size={48} />
              <div className="member-card__body">
                <h3>{member.name}</h3>
                <p>
                  {member.relationship === "SELF"
                    ? "You"
                    : member.relationship
                      ? titleCase(member.relationship)
                      : "Family member"}
                </p>
                {member.dateOfBirth && (
                  <span className="member-card__meta">
                    <Cake size={14} />
                    {formatDate(member.dateOfBirth)}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} title="Add a family member" onClose={closeModal}>
        <form onSubmit={handleSubmit} noValidate className="modal__form">
          <Alert type="error">{formError}</Alert>

          <TextField
            label="Full name"
            icon={User}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Rohan Patil"
            autoComplete="off"
          />

          <div className="field">
            <label className="field__label" htmlFor="relationship">
              Relationship
            </label>
            <div className="field__control">
              <select
                id="relationship"
                className="field__input field__input--select"
                value={form.relationship}
                onChange={(e) =>
                  setForm((f) => ({ ...f, relationship: e.target.value }))
                }
              >
                <option value="">Choose one (optional)</option>
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {titleCase(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <TextField
            label="Date of birth"
            type="date"
            max={today}
            value={form.dateOfBirth}
            onChange={(e) =>
              setForm((f) => ({ ...f, dateOfBirth: e.target.value }))
            }
            hint="Optional"
          />

          <div className="modal__actions">
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Add family member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}