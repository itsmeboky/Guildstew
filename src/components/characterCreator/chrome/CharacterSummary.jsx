import React from "react";

export function CharacterSummary({ data = {}, compact = false, icon = null }) {
  const portrait = data.profile_avatar_url || data.avatar_url || data.profile_avatar || null;
  const name = data.name || (compact ? "Unnamed" : "Unnamed Hero");
  const level = data.level || 1;
  const race = data.race || "";
  const subrace = data.subrace || "";
  const cls = data.class || "";
  const subclass = data.subclass || "";
  const background = data.background || "";
  const alignment = data.alignment || "";
  const companion = data.companion_name
    || (Array.isArray(data.companions) && data.companions[0]?.name)
    || "";

  if (compact) {
    return (
      <div className="panel" style={{ padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
        <Portrait portrait={portrait} icon={icon} size={44} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="display" style={{ fontSize: 18, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
            {`L${level} ${subrace ? subrace + " " : ""}${race || "—"} ${cls}`.trim()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ padding: 18 }}>
      <div className="label" style={{ marginBottom: 12 }}>Character so far</div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
        <Portrait portrait={portrait} icon={icon} size={64} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="display" style={{ fontSize: 22, color: "var(--text)", lineHeight: 1.1, wordBreak: "break-word" }}>
            {name}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>Level {level}</div>
        </div>
      </div>

      <SummaryRow label="Race" value={race ? `${subrace ? subrace + " " : ""}${race}` : "—"} />
      <SummaryRow label="Background" value={background || "—"} />
      <SummaryRow label="Alignment" value={alignment || "—"} />
      <SummaryRow label="Class" value={cls || "—"} />
      {cls && subclass && <SummaryRow label="Subclass" value={subclass} />}
      {companion && <SummaryRow label="Companion" value={companion} />}
    </div>
  );
}

function Portrait({ portrait, icon, size }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: portrait ? `url(${portrait}) center/cover` : "var(--bg-3)",
        border: `${size >= 64 ? 2.5 : 2}px solid var(--orange)`,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size >= 64 ? 28 : 20,
      }}
    >
      {!portrait && (icon || "?")}
    </div>
  );
}

export function SummaryRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ color: "var(--text-faint)", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ color: "var(--text)", fontWeight: 600, textAlign: "right", maxWidth: "60%" }}>
        {value}
      </span>
    </div>
  );
}
