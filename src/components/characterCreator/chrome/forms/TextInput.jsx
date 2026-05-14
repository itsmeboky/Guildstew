import React from "react";

export function TextInput({ value, onChange, placeholder, label, required, maxLength, type = "text" }) {
  return (
    <div>
      {label && (
        <div className="label" style={{ marginBottom: 6 }}>
          {label} {required && <span style={{ color: "var(--orange)" }}>*</span>}
        </div>
      )}
      <input
        className="input"
        type={type}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  );
}
