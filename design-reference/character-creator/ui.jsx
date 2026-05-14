// Shared UI components for the character creator.
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// --- Ornate heading with flanking gold lines and diamond flourishes ---
function OrnateHeading({ children, kicker, color }) {
  return (
    <div className="ornate-heading">
      <span className="ornate-flourish" style={{ background: color || 'var(--gold)' }}></span>
      <h3 style={{ color: 'var(--text)' }}>{children}</h3>
      <span className="ornate-flourish" style={{ background: color || 'var(--gold)' }}></span>
    </div>
  );
}

// --- Fleur-de-lis divider — horizontal rule with center ornament ---
function FleurDivider() {
  return (
    <div className="fleur-divider" aria-hidden>
      <svg viewBox="0 0 22 22" fill="none">
        <path d="M11 2 L11 20 M2 11 L20 11 M5 5 L17 17 M17 5 L5 17" stroke="var(--gold-deep)" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
        <circle cx="11" cy="11" r="2.5" fill="var(--gold)" />
        <circle cx="11" cy="11" r="4.5" fill="none" stroke="var(--gold)" strokeWidth="0.6" />
      </svg>
    </div>
  );
}

// --- Decorative scroll bracket for section starts ---
function ScrollBracket({ side = 'left', children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {side === 'left' && (
        <svg width="20" height="40" viewBox="0 0 20 40" style={{ flexShrink: 0, opacity: 0.7 }}>
          <path d="M16 2 Q4 4 4 20 Q4 36 16 38" stroke="var(--gold)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <circle cx="6" cy="20" r="1.6" fill="var(--gold)" />
        </svg>
      )}
      <div style={{ flex: 1 }}>{children}</div>
      {side === 'right' && (
        <svg width="20" height="40" viewBox="0 0 20 40" style={{ flexShrink: 0, opacity: 0.7, transform: 'scaleX(-1)' }}>
          <path d="M16 2 Q4 4 4 20 Q4 36 16 38" stroke="var(--gold)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <circle cx="6" cy="20" r="1.6" fill="var(--gold)" />
        </svg>
      )}
    </div>
  );
}

// --- Help tooltip ---
function HelpTip({ children, label }) {
  return (
    <span className="help-tip" data-tip={children} aria-label={label || 'Help'}>?</span>
  );
}

// --- Primer banner for new-player tips ---
function Primer({ title, children, color }) {
  const c = color || 'teal';
  const borderColor = c === 'orange' ? 'var(--orange)' : c === 'gold' ? 'var(--gold)' : 'var(--teal)';
  const titleColor = c === 'orange' ? 'var(--orange-soft)' : c === 'gold' ? 'var(--gold)' : 'var(--teal)';
  return (
    <div className="primer" style={{ borderLeftColor: borderColor, background: `linear-gradient(135deg, ${titleColor}14, transparent)`, borderColor: `${titleColor}40` }}>
      {title && <div className="primer-title" style={{ color: titleColor }}>{title}</div>}
      <div>{children}</div>
    </div>
  );
}

// --- Section label ---
function SectionLabel({ children, required, optional, help }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <div className="label" style={{ color: 'var(--text)', letterSpacing: 1.5 }}>{children}</div>
      {required && <span style={{ color: 'var(--orange-soft)', fontSize: 11, fontWeight: 800 }}>REQUIRED</span>}
      {optional && <span style={{ color: 'var(--text-faint)', fontSize: 11, fontWeight: 700 }}>OPTIONAL</span>}
      {help && <HelpTip>{help}</HelpTip>}
    </div>
  );
}

// --- Image uploader / placeholder ---
function PortraitUpload({ src, onChange, shape, label, placeholder, height }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      {label && <div className="label" style={{ marginBottom: 8 }}>{label}</div>}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        style={{
          width: '100%',
          height: shape === 'circle' ? 'auto' : (height || 320),
          borderRadius: shape === 'circle' ? '50%' : 14,
          aspectRatio: shape === 'circle' ? '1 / 1' : undefined,
          maxWidth: shape === 'circle' ? 180 : '100%',
          margin: shape === 'circle' ? '0 auto' : undefined,
          background: src ? `url(${src}) center/cover` : 'rgba(11,19,28,0.6)',
          border: `2px ${drag ? 'solid' : 'dashed'} ${drag ? 'var(--orange)' : src ? 'var(--orange)' : 'var(--border-strong)'}`,
          cursor: 'pointer', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'border-color .15s, background .15s', overflow: 'hidden',
        }}
      >
        {!src && (
          <div style={{ textAlign: 'center', color: 'var(--text-faint)', pointerEvents: 'none', padding: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.4 }}>⊕</div>
            {placeholder?.trim() && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)' }}>{placeholder}</div>
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.6 }}>PNG · JPG · WebP</div>
              </>
            )}
          </div>
        )}
        {src && (
          <button
            onClick={(e) => { e.stopPropagation(); onChange(''); }}
            style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,0.7)', color: 'white',
              border: 'none', borderRadius: 6, padding: '4px 8px',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}
          >Replace</button>
        )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files[0])} />
      </div>
    </div>
  );
}

// --- Big input ---
function TextInput({ value, onChange, placeholder, label, required, maxLength }) {
  return (
    <div>
      {label && <div className="label" style={{ marginBottom: 6 }}>{label} {required && <span style={{ color: 'var(--orange)' }}>*</span>}</div>}
      <input
        className="input"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </div>
  );
}

function NumberInput({ value, onChange, min, max, label }) {
  return (
    <div>
      {label && <div className="label" style={{ marginBottom: 6 }}>{label}</div>}
      <input
        type="number" className="input" value={value || ''} min={min} max={max}
        onChange={(e) => {
          const v = e.target.value === '' ? '' : Number(e.target.value);
          onChange(v);
        }}
      />
    </div>
  );
}

function Select({ value, onChange, options, label, placeholder }) {
  return (
    <div>
      {label && <div className="label" style={{ marginBottom: 6 }}>{label}</div>}
      <select className="input" value={value || ''} onChange={(e) => onChange(e.target.value)}
        style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'%237B8AA0\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 36 }}>
        <option value="">{placeholder || 'Select…'}</option>
        {options.map(o => (
          <option key={o.value || o.id || o} value={o.value || o.id || o}>{o.label || o.name || o}</option>
        ))}
      </select>
    </div>
  );
}

// --- Stepper (top of page) ---
const STEP_DEFS = [
  { id: 'identity', label: 'Identity' },
  { id: 'class', label: 'Class & Path' },
  { id: 'abilities', label: 'Abilities' },
  { id: 'features', label: 'Features' },
  { id: 'skills', label: 'Skills' },
  { id: 'spells', label: 'Spells' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'review', label: 'Review' },
];

function Stepper({ current, completed, onClick }) {
  return (
    <div className="panel" style={{ padding: '20px 24px', marginBottom: 28, position: 'relative' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STEP_DEFS.length}, 1fr)`, gap: 6, marginBottom: 16, position: 'relative' }}>
        {/* Connecting line */}
        <div style={{ position: 'absolute', top: 22, left: '5%', right: '5%', height: 1, background: 'linear-gradient(90deg, var(--gold-deep), var(--gold), var(--gold-deep))', opacity: 0.4, zIndex: 0 }}></div>
        {STEP_DEFS.map((s, i) => {
          const isDone = completed.includes(i);
          const isActive = i === current;
          const clickable = isDone || i < current || i === current;
          return (
            <div key={s.id} onClick={() => clickable && onClick(i)}
              style={{ textAlign: 'center', cursor: clickable ? 'pointer' : 'not-allowed', opacity: clickable ? 1 : 0.5, position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 44, height: 44, margin: '0 auto 10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 16, transition: 'all .2s',
                background: isActive
                  ? 'radial-gradient(circle, var(--orange) 0%, var(--orange-deep) 100%)'
                  : isDone ? 'radial-gradient(circle, #1F3D38 0%, #0F1D1A 100%)' : 'var(--bg-2)',
                color: isActive ? 'white' : isDone ? 'var(--teal)' : 'var(--text-faint)',
                border: `2px solid ${isActive ? 'var(--gold)' : isDone ? 'var(--teal-dark)' : 'var(--border)'}`,
                boxShadow: isActive ? `0 0 0 4px rgba(255,83,0,0.20), 0 0 18px var(--orange-glow)` : isDone ? '0 0 12px rgba(55, 242, 209, 0.2)' : 'none',
                transform: 'rotate(45deg)',
                fontFamily: 'var(--display)',
              }}>
                <span style={{ transform: 'rotate(-45deg)' }}>
                  {isDone && !isActive ? '✓' : i + 1}
                </span>
              </div>
              <div style={{
                fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
                color: isActive ? 'var(--orange-soft)' : isDone ? 'var(--teal)' : 'var(--text-faint)',
              }}>{s.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ height: 4, background: 'rgba(20, 12, 8, 0.6)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border-faint)' }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, var(--orange-deep) 0%, var(--orange) 40%, var(--gold) 80%, var(--teal) 100%)',
          width: `${((current + 1) / STEP_DEFS.length) * 100}%`,
          transition: 'width 0.5s ease',
          boxShadow: '0 0 12px var(--orange-glow)',
        }} />
      </div>
    </div>
  );
}

// --- Step header (title + subtitle on each step) — illuminated manuscript feel ---
function StepHeader({ title, subtitle, kicker }) {
  return (
    <div style={{ marginBottom: 28, textAlign: 'center', position: 'relative' }}>
      {kicker && (
        <div className="label" style={{ marginBottom: 10, color: 'var(--gold)' }}>{kicker}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 12 }}>
        <svg width="60" height="14" viewBox="0 0 60 14" style={{ flexShrink: 0 }}>
          <path d="M0 7 L52 7" stroke="var(--gold-deep)" strokeWidth="1" />
          <circle cx="56" cy="7" r="3" fill="var(--gold)" />
          <circle cx="56" cy="7" r="5.5" fill="none" stroke="var(--gold)" strokeWidth="0.6" />
        </svg>
        <h2 className="display" style={{ fontSize: 46, color: 'var(--text)', lineHeight: 1, textShadow: '0 2px 12px rgba(255, 83, 0, 0.18)', letterSpacing: 1 }}>{title}</h2>
        <svg width="60" height="14" viewBox="0 0 60 14" style={{ flexShrink: 0, transform: 'scaleX(-1)' }}>
          <path d="M0 7 L52 7" stroke="var(--gold-deep)" strokeWidth="1" />
          <circle cx="56" cy="7" r="3" fill="var(--gold)" />
          <circle cx="56" cy="7" r="5.5" fill="none" stroke="var(--gold)" strokeWidth="0.6" />
        </svg>
      </div>
      {subtitle && <p className="italic-serif" style={{ color: 'var(--text-dim)', margin: 0, fontSize: 17, letterSpacing: 0.2 }}>{subtitle}</p>}
    </div>
  );
}

// --- Nav buttons at bottom ---
function StepNav({ onBack, onNext, canBack, canNext, nextLabel, blockedReason }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
      <button className="btn btn-ghost" onClick={onBack} disabled={!canBack}>
        ‹ Back
      </button>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {blockedReason && !canNext && (
          <div style={{ fontSize: 13, color: 'var(--warn)', fontWeight: 600 }}>⚠ {blockedReason}</div>
        )}
        <button className="btn btn-primary" onClick={onNext} disabled={!canNext}>
          {nextLabel || 'Continue'} ›
        </button>
      </div>
    </div>
  );
}

// --- Character summary side card (used on multiple steps) ---
function CharacterSummary({ data, compact }) {
  const race = RACES.find(r => r.id === data.race);
  const subrace = race?.subraces.find(s => s.id === data.subrace);
  const bg = BACKGROUNDS.find(b => b.id === data.background);
  const cls = CLASSES.find(c => c.id === data.class);
  const subcls = cls?.subclasses.find(s => s.id === data.subclass);

  if (compact) {
    return (
      <div className="panel" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: data.profile_avatar ? `url(${data.profile_avatar}) center/cover` : 'var(--bg-3)',
          border: '2px solid var(--orange)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>{!data.profile_avatar && (race?.icon || '?')}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="display" style={{ fontSize: 18, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {data.name || 'Unnamed'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            L{data.level} {subrace?.name || ''} {race?.name || '—'} {cls?.name || ''}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel" style={{ padding: 18 }}>
      <div className="label" style={{ marginBottom: 12 }}>Character so far</div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: data.profile_avatar ? `url(${data.profile_avatar}) center/cover` : 'var(--bg-3)',
          border: '2.5px solid var(--orange)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
        }}>{!data.profile_avatar && (race?.icon || '?')}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="display" style={{ fontSize: 22, color: 'var(--text)', lineHeight: 1.1, wordBreak: 'break-word' }}>
            {data.name || 'Unnamed Hero'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            Level {data.level || 1}
          </div>
        </div>
      </div>

      <SummaryRow label="Race" value={race ? `${subrace?.name ? subrace.name + ' ' : ''}${race.name}` : '—'} />
      <SummaryRow label="Background" value={bg?.name || '—'} />
      <SummaryRow label="Alignment" value={ALIGNMENTS.find(a => a.id === data.alignment)?.name || '—'} />
      <SummaryRow label="Class" value={cls ? cls.name : '—'} />
      {cls && subcls && <SummaryRow label={cls.subclassName} value={subcls.name} />}
      {data.companion && <SummaryRow label="Companion" value={data.companion} />}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
      <span style={{ color: 'var(--text-faint)', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

// --- Two-column layout ---
function TwoCol({ left, right, ratio }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: ratio || '1.6fr 1fr', gap: 24 }}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

Object.assign(window, {
  HelpTip, Primer, SectionLabel, PortraitUpload, TextInput, NumberInput, Select,
  Stepper, StepHeader, StepNav, CharacterSummary, TwoCol, STEP_DEFS,
  OrnateHeading, FleurDivider, ScrollBracket, SummaryRow,
});
