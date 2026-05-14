import React from "react";

/**
 * Themed number input. Empty string is preserved as a valid value so
 * the caller can distinguish "user cleared the field" from "user typed 0".
 *
 * Ported from design-reference/character-creator/ui.jsx (~157-170).
 */
export function NumberInput({ value, onChange, min, max, label, placeholder }) {
  return (
    <div>
      {label && (
        <div className="cc-label" style={{ marginBottom: 6 }}>
          {label}
        </div>
      )}
      <input
        type="number"
        className="cc-input"
        value={value ?? ""}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          onChange?.(raw === "" ? "" : Number(raw));
        }}
      />
    </div>
  );
}
