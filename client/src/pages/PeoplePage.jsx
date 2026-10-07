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
import { createPerson, getPeople } from "../services/person.service";
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

export default function PeoplePage() {
  useDocumentTitle("People");

  const { refreshHousehold } = useAuth();
  const toast = useToast();

  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    getPeople()
      .then((data) => {
        if (active) setPeople(data);
      })
      .catch((err) => {
        if (active) setLoadError(getErrorMessage(err, "Couldn't load your people."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const retry = () => {
    setLoading(true);
    setLoadError("");
    setReloadKey((k) => k + 1);
  };

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

    setSaving(true);
    setFormError("");
    try {
      const person = await createPerson({
        name: form.name.trim(),
        relationship: form.relationship,
        dateOfBirth: form.dateOfBirth,
      });
      setPeople((current) => [...current, person]);
      refreshHousehold().catch(() => {}); // keep the dashboard in step
      toast.success(`${person.name} added.`);
      closeModal();
    } catch (err) {
      setFormError(getErrorMessage(err, "Couldn't add this person."));
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>People</h1>
          <p>Everyone in your household whose assets you manage.</p>
        </div>
        <Button icon={Plus} onClick={() => setOpen(true)}>
          Add person
        </Button>
      </header>

      {loadError && (
        <div className="page__alert">
          <Alert type="error">{loadError}</Alert>
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      )}

      {loading ? (
        <div className="cards">
          {[0, 1, 2].map((i) => (
            <div key={i} className="person-card">
              <span className="skeleton skeleton--avatar" />
              <span className="skeleton skeleton--line" />
            </div>
          ))}
        </div>
      ) : people.length === 0 && !loadError ? (
        <section className="panel">
          <EmptyState
            icon={Users}
            title="No one here yet"
            description="Add a family member to start organising their assets."
            action={
              <Button icon={Plus} onClick={() => setOpen(true)}>
                Add person
              </Button>
            }
          />
        </section>
      ) : (
        <div className="cards">
          {people.map((person) => (
            <article key={person._id} className="person-card">
              <Avatar name={person.name} size={48} />
              <div className="person-card__body">
                <h3>{person.name}</h3>
                <p>
                  {person.relationship === "SELF"
                    ? "You"
                    : person.relationship
                      ? titleCase(person.relationship)
                      : "Family member"}
                </p>
                {person.dateOfBirth && (
                  <span className="person-card__meta">
                    <Cake size={14} />
                    {formatDate(person.dateOfBirth)}
                  </span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={open} title="Add a person" onClose={closeModal}>
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
              Add person
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
