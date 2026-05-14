import React from "react";

export function Select({ value, onChange, options = [], label, placeholder }) {
  return (
    <div>
      {label && <div className="label" style={{ marginBottom: 6 }}>{label}</div>}
      <select
        className="input"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          appearance: "none",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%237B8AA0' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 12px center",
          paddingRight: 36,
        }}
      >
        <option value="">{placeholder || "Select…"}</option>
        {options.map((opt) => {
          const val = opt?.value ?? opt?.id ?? opt;
          const lbl = opt?.label ?? opt?.name ?? opt;
          return (
            <option key={val} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
    </div>
  );
}
