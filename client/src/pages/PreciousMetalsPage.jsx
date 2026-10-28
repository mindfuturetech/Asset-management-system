import { useEffect, useMemo, useState } from "react";
import { Coins, Plus, Pencil, Trash2, Scale, X } from "lucide-react";
import useAuth from "../hooks/useAuth";
import useFamilyMembers from "../hooks/useFamilyMembers";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useToast from "../hooks/useToast";
import Alert from "../components/ui/Alert";
import EmptyState from "../components/ui/EmptyState";
import "../styles/precious-metals.css";
import {
    preciousMetalApi,
    totalPurchaseValue,
    totalWeightGrams,
} from "../services/preciousMetal.service";
import { formatDate, titleCase } from "../utils/validators";


const EMPTY_FORM = {
    personId: "",
    metalType: "GOLD",
    description: "",
    weight: "",
    weightUnit: "GRAM",
    purity: "",
    purchaseDate: "",
    purchasePrice: "",
    source: "PURCHASED",
    notes: "",
};

function formatINR(n) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n || 0);
}

const dateInput = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export default function PreciousMetalsPage() {
    useDocumentTitle("Precious Metals");

    const { household } = useAuth();
    const householdId = household?._id ?? household?.id;
    const toast = useToast();

    const {
        familyMembers,
        loading: familyLoading,
        error: familyError,
    } = useFamilyMembers(householdId);

    const [metals, setMetals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null); // { personId, metalId }
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [deletingId, setDeletingId] = useState(null);

    const load = async () => {
        if (!familyMembers.length) {
            setMetals([]);
            return;
        }
        setLoading(true);
        setError("");
        try {
            const rows = await preciousMetalApi.getHouseholdMetals(familyMembers);
            setMetals(rows);
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load precious metals.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [familyMembers]);

    const totalValue = useMemo(() => totalPurchaseValue(metals), [metals]);
    const totalWeight = useMemo(() => totalWeightGrams(metals), [metals]);

    const openCreate = () => {
        setEditing(null);
        setForm({
            ...EMPTY_FORM,
            personId: familyMembers[0]?._id || "",
            purchaseDate: new Date().toISOString().slice(0, 10),
        });
        setFormError("");
        setModalOpen(true);
    };

    const openEdit = (metal) => {
        setEditing({ personId: metal.personId, metalId: metal._id });
        setForm({
            personId: String(metal.personId),
            metalType: metal.metalType,
            description: metal.description || "",
            weight: String(metal.weight),
            weightUnit: metal.weightUnit || "GRAM",
            purity: metal.purity != null ? String(metal.purity) : "",
            purchaseDate: dateInput(metal.purchaseDate),
            purchasePrice: String(metal.purchasePrice),
            source: metal.source || "PURCHASED",
            notes: metal.notes || "",
        });
        setFormError("");
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;
        setModalOpen(false);
    };

    const onChange = (e) =>
        setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

    const validate = () => {
        if (!form.personId) return "Select a family member.";
        if (!form.metalType) return "Select a metal type.";
        if (!form.weight || Number(form.weight) <= 0) return "Weight must be greater than 0.";
        if (form.purity !== "" && Number(form.purity) < 0) return "Purity cannot be negative.";
        if (!form.purchaseDate) return "Purchase date is required.";
        if (form.purchasePrice === "" || Number(form.purchasePrice) < 0)
            return "Purchase price is required.";
        return "";
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        const v = validate();
        if (v) {
            setFormError(v);
            return;
        }
        setSaving(true);
        setFormError("");
        const payload = {
            metalType: form.metalType,
            description: form.description.trim() || undefined,
            weight: Number(form.weight),
            weightUnit: form.weightUnit,
            purity: form.purity === "" ? undefined : Number(form.purity),
            purchaseDate: form.purchaseDate,
            purchasePrice: Number(form.purchasePrice),
            source: form.source,
            notes: form.notes.trim() || undefined,
        };
        try {
            if (editing) {
                await preciousMetalApi.update(editing.personId, editing.metalId, payload);
                toast.success("Precious metal updated.");
            } else {
                await preciousMetalApi.create(form.personId, payload);
                toast.success("Precious metal added.");
            }
            setModalOpen(false);
            await load();
        } catch (err) {
            setFormError(
                err?.response?.data?.message || "Could not save. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    const onDelete = async (metal) => {
        if (!window.confirm(`Delete "${metal.description || metal.metalType}"?`)) return;
        setDeletingId(metal._id);
        try {
            await preciousMetalApi.remove(metal.personId, metal._id);
            toast.success("Precious metal deleted.");
            setMetals((prev) => prev.filter((m) => m._id !== metal._id));
        } catch (err) {
            toast.error(err?.response?.data?.message || "Delete failed.");
        } finally {
            setDeletingId(null);
        }
    };

    const noPeople = !familyLoading && familyMembers.length === 0;

    return (
        <div className="page">
            <header className="page__header">
                <div>
                    <h1>Precious Metals</h1>
                    <p>Track gold, silver and platinum across your household.</p>
                </div>
                <button
                    type="button"
                    className="btn btn--primary"
                    onClick={openCreate}
                    disabled={noPeople}
                >
                    <Plus size={18} /> Add Metal
                </button>
            </header>

            {/* Summary strip */}
            <section className="pm-summary" aria-label="Total">
                <div className="pm-summary__card">
                    <span className="pm-summary__icon"><Coins size={20} /></span>
                    <div>
                        <p className="pm-summary__label">Total purchase value</p>
                        <p className="pm-summary__value">{formatINR(totalValue)}</p>
                    </div>
                </div>
                <div className="pm-summary__card">
                    <span className="pm-summary__icon"><Scale size={20} /></span>
                    <div>
                        <p className="pm-summary__label">Total weight</p>
                        <p className="pm-summary__value">
                            {totalWeight.toLocaleString("en-IN")} g
                        </p>
                    </div>
                </div>
            </section>

            {familyError && <Alert type="error">{familyError}</Alert>}
            {error && <Alert type="error">{error}</Alert>}

            {noPeople ? (
                <EmptyState
                    icon={Coins}
                    title="Add a family member first"
                    description="Precious metals belong to a person. Add someone on the Family page."
                />
            ) : loading || familyLoading ? (
                <ul className="pm-list">
                    {[0, 1, 2].map((i) => (
                        <li key={i} className="pm-row">
                            <span className="skeleton skeleton--line" />
                        </li>
                    ))}
                </ul>
            ) : metals.length === 0 ? (
                <EmptyState
                    icon={Coins}
                    title="No precious metals yet"
                    description="Record your first gold or silver item."
                />
            ) : (
                <ul className="pm-list">
                    {metals.map((m) => (
                        <li key={m._id} className="pm-row">
                            <span className={`pm-row__badge pm-row__badge--${m.metalType.toLowerCase()}`}>
                                {m.metalType}
                            </span>
                            <div className="pm-row__main">
                                <strong>{m.description || titleCase(m.metalType)}</strong>
                                <span>
                                    {m.personName} · {Number(m.weight)} {m.weightUnit === "KILOGRAM" ? "kg" : "g"}
                                    {m.purity != null ? ` · ${m.purity}K` : ""}
                                    {` · ${formatDate(m.purchaseDate)}`}
                                </span>
                            </div>
                            <span className="pm-row__price">{formatINR(m.purchasePrice)}</span>
                            <div className="pm-row__actions">
                                <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => openEdit(m)}
                                    aria-label="Edit"
                                    title="Edit"
                                >
                                    <Pencil size={17} />
                                </button>
                                <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => onDelete(m)}
                                    disabled={deletingId === m._id}
                                    aria-label="Delete"
                                    title="Delete"
                                >
                                    <Trash2 size={17} />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {modalOpen && (
                <div className="modal" role="dialog" aria-modal="true" onClick={closeModal}>
                    <div className="modal__panel" onClick={(e) => e.stopPropagation()}>
                        <div className="modal__header">
                            <h2>{editing ? "Edit Metal" : "Add Metal"}</h2>
                            <button type="button" className="modal__close" onClick={closeModal} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>

                        {formError && <Alert type="error">{formError}</Alert>}

                        <form onSubmit={onSubmit}>
                            <div className="field">
                                <label className="field__label" htmlFor="pm-person">Family member</label>
                                <select
                                    id="pm-person"
                                    name="personId"
                                    className="field__input field__input--select"
                                    value={form.personId}
                                    onChange={onChange}
                                    disabled={!!editing}
                                >
                                    <option value="">Select…</option>
                                    {familyMembers.map((p) => (
                                        <option key={p._id} value={p._id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pm-form-grid">
                                <div className="field">
                                    <label className="field__label" htmlFor="pm-type">Metal</label>
                                    <select id="pm-type" name="metalType" className="field__input field__input--select" value={form.metalType} onChange={onChange}>
                                        <option value="GOLD">Gold</option>
                                        <option value="SILVER">Silver</option>
                                        <option value="PLATINUM">Platinum</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label className="field__label" htmlFor="pm-source">Source</label>
                                    <select id="pm-source" name="source" className="field__input field__input--select" value={form.source} onChange={onChange}>
                                        <option value="PURCHASED">Purchased</option>
                                        <option value="GIFT">Gift</option>
                                        <option value="INHERITED">Inherited</option>
                                        <option value="OTHER">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="field">
                                <label className="field__label" htmlFor="pm-desc">Description</label>
                                <input id="pm-desc" name="description" className="field__input" value={form.description} onChange={onChange} placeholder="e.g. Gold Chain" />
                            </div>

                            <div className="pm-form-grid pm-form-grid--3">
                                <div className="field">
                                    <label className="field__label" htmlFor="pm-weight">Weight</label>
                                    <input id="pm-weight" name="weight" type="number" min="0" step="0.01" className="field__input" value={form.weight} onChange={onChange} />
                                </div>
                                <div className="field">
                                    <label className="field__label" htmlFor="pm-unit">Unit</label>
                                    <select id="pm-unit" name="weightUnit" className="field__input field__input--select" value={form.weightUnit} onChange={onChange}>
                                        <option value="GRAM">Gram</option>
                                        <option value="KILOGRAM">Kilogram</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label className="field__label" htmlFor="pm-purity">Purity</label>
                                    <input id="pm-purity" name="purity" type="number" min="0" step="1" className="field__input" value={form.purity} onChange={onChange} placeholder="22" />
                                </div>
                            </div>

                            <div className="pm-form-grid">
                                <div className="field">
                                    <label className="field__label" htmlFor="pm-date">Purchase date</label>
                                    <input id="pm-date" name="purchaseDate" type="date" className="field__input" value={form.purchaseDate} onChange={onChange} />
                                </div>
                                <div className="field">
                                    <label className="field__label" htmlFor="pm-price">Purchase price (₹)</label>
                                    <input id="pm-price" name="purchasePrice" type="number" min="0" step="0.01" className="field__input" value={form.purchasePrice} onChange={onChange} />
                                </div>
                            </div>

                            <div className="field">
                                <label className="field__label" htmlFor="pm-notes">Notes</label>
                                <input id="pm-notes" name="notes" className="field__input" value={form.notes} onChange={onChange} />
                            </div>

                            <div className="modal__actions">
                                <button type="button" className="btn btn--secondary" onClick={closeModal} disabled={saving}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn--primary" disabled={saving}>
                                    {saving ? "Saving…" : editing ? "Save changes" : "Add metal"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}