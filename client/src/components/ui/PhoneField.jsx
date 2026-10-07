import { useId } from "react";
import { Phone } from "lucide-react";
import { COUNTRY_CODES } from "../../utils/validators";

export default function PhoneField({
  label = "Mobile number",
  countryCode,
  number,
  onCountryChange,
  onNumberChange,
  error,
  hint,
  ...inputProps
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`field ${error ? "field--error" : ""}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control field__control--phone">
        <select
          className="field__select"
          value={countryCode}
          onChange={(e) => onCountryChange(e.target.value)}
          aria-label="Country code"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code}
            </option>
          ))}
        </select>
        <Phone size={18} className="field__icon field__icon--phone" aria-hidden="true" />
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          className="field__input field__input--phone"
          value={number}
          onChange={(e) => onNumberChange(e.target.value.replace(/[^\d\s-]/g, ""))}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...inputProps}
        />
      </div>
      {error ? (
        <p className="field__error" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
