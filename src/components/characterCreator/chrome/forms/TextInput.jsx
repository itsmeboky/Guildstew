import React from "react";

/**
 * Themed text input. Ported from
 * design-reference/character-creator/ui.jsx (~142-155).
 */
export function TextInput({
  value,
  onChange,
  placeholder,
  label,
  required,
  maxLength,
  type = "text",
}) {
  return (
    <div>
      {label && (
        <div className="cc-label" style={{ marginBottom: 6 }}>
          {label}
          {required && (
            <span style={{ color: "var(--cc-orange)", marginLeft: 4 }}>*</span>
          )}
        </div>
      )}
      <input
        className="cc-input"
        type={type}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  );
}
