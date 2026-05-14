import React from "react";
import { HelpTip } from "./HelpTip";

export function SectionLabel({ children, required, optional, help }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div className="label" style={{ color: "var(--text)", letterSpacing: 1.5 }}>
        {children}
      </div>
      {required && <span style={{ color: "var(--orange-soft)", fontSize: 11, fontWeight: 800 }}>REQUIRED</span>}
      {optional && <span style={{ color: "var(--text-faint)", fontSize: 11, fontWeight: 700 }}>OPTIONAL</span>}
      {help && <HelpTip>{help}</HelpTip>}
    </div>
  );
}
