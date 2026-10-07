import { useRef } from "react";

/**
 * Six separate cells that behave like one field:
 * typing advances, backspace steps back, arrows move, and pasting a full
 * code (or the browser's one-time-code autofill) fills every cell.
 */
export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
}) {
  const refs = useRef([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const focusCell = (index) => {
    const el = refs.current[Math.min(Math.max(index, 0), length - 1)];
    el?.focus();
    el?.select();
  };

  const commit = (next) => {
    onChange(next);
    if (next.length === length) onComplete?.(next);
  };

  const handleChange = (index, raw) => {
    const incoming = raw.replace(/\D/g, "");
    if (!incoming) return;

    if (incoming.length === 1) {
      // One digit: replace this cell, keep the rest.
      const next = (value.slice(0, index) + incoming + value.slice(index + 1)).slice(0, length);
      commit(next);
      focusCell(index + 1);
      return;
    }

    // Several digits at once: paste, or autofill into one cell.
    const next = (value.slice(0, index) + incoming).slice(0, length);
    commit(next);
    focusCell(next.length >= length ? length - 1 : next.length);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[index]) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        onChange(value.slice(0, index - 1) + value.slice(index));
        focusCell(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusCell(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusCell(index + 1);
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.slice(0, length);
    commit(next);
    focusCell(next.length >= length ? length - 1 : next.length);
  };

  return (
    <div
      className={`otp ${invalid ? "otp--invalid" : ""}`}
      role="group"
      aria-label="One-time code"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          className="otp__cell"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={index === 0}
          maxLength={length}
          value={digit}
          data-filled={Boolean(digit)}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
