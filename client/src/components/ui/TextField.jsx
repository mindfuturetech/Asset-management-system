import { useId } from "react";

export default function TextField({
  label,
  icon: Icon,
  error,
  hint,
  className = "",
  ...inputProps
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={`field ${error ? "field--error" : ""} ${className}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        {Icon && <Icon size={18} className="field__icon" aria-hidden="true" />}
        <input
          id={id}
          className={`field__input ${Icon ? "field__input--icon" : ""}`}
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
