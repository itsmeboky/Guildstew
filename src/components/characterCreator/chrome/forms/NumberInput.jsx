import React from "react";

export function NumberInput({ value, onChange, min, max, label, placeholder }) {
  return (
    <div>
      {label && <div className="label" style={{ marginBottom: 6 }}>{label}</div>}
      <input
        type="number"
        className="input"
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
