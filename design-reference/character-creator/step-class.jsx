// Step 2: Class & Path — single featured layout, always. Class roster is the
// picker; left tome shows the featured class details (or an inviting empty
// state when nothing is selected). Adds image+name+description ally cards
// for warlock patrons, ranger companions, paladin mounts, cleric deities, etc.

function StepClass({ data, update }) {
  const cls = CLASSES.find(c => c.id === data.class);
  return (
    <div className="step-content">
      <StepHeader
        kicker="Chapter II · The Calling"
        title="Choose your path"
        subtitle="What kind of hero is this? Each calling shapes your spells, your weapons, your destiny."
      />

      <Primer title="How to pick a class">
        Pick the <strong>fantasy</strong> first — the kind of hero you want to be. The mechanics will follow. Some classes — like Warlock, Paladin, Cleric — bring along a <strong>patron, deity, companion,</strong> or <strong>mount</strong> that you'll detail below.
      </Primer>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 28, alignItems: 'flex-start', marginTop: 28 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {cls ? (
            <ClassFeaturedTome cls={cls} data={data} update={update} />
          ) : (
            <EmptyClassPrompt />
          )}

          {cls && <BondsTome cls={cls} data={data} update={update} />}
        </div>

        <div style={{ position: 'sticky', top: 20, alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ClassRoster current={data.class} onPick={(id) => update({ class: id, subclass: '', patron: '', companion: '' })} />
          {cls && <ClassBuildSummary cls={cls} data={data} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE — same layout, inviting message
// ============================================================================
function EmptyClassPrompt() {
  return (
    <div className="tome" style={{ padding: '60px 36px', textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
      <div style={{ fontSize: 56, opacity: 0.4, marginBottom: 8 }}>✦</div>
      <div className="display" style={{ fontSize: 32, color: 'var(--text)' }}>Choose a calling</div>
      <div className="italic-serif" style={{ fontSize: 16, color: 'var(--text-dim)', maxWidth: 400, lineHeight: 1.5 }}>
        Pick one of the twelve callings from the roster — the chapter will unfurl with their lore.
      </div>
    </div>
  );
}

// ============================================================================
// FEATURED CLASS TOME — full lore + subclass picker
// ============================================================================
function ClassFeaturedTome({ cls, data, update }) {
  return (
    <div className="tome" style={{ padding: '32px 36px' }}>
      <FeaturedClassHero cls={cls} />
      <FleurDivider />
      <SubclassChapter cls={cls} data={data} update={update} />
    </div>
  );
}

function FeaturedClassHero({ cls }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20 }}>
        <div style={{
          width: 100, height: 100,
          background: `radial-gradient(circle, ${cls.color}55 0%, ${cls.color}11 50%, transparent 75%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 64, lineHeight: 1, flexShrink: 0,
          filter: `drop-shadow(0 4px 16px ${cls.color}66)`,
        }}>
          <span style={{ filter: 'sepia(0.1)' }}>{cls.icon}</span>
        </div>

        <div style={{ flex: 1 }}>
          <div className="label" style={{ color: cls.color, marginBottom: 6 }}>The {classFamily(cls)}</div>
          <div className="display" style={{ fontSize: 44, color: 'var(--text)', lineHeight: 1, marginBottom: 8, letterSpacing: 1, textShadow: `0 2px 16px ${cls.color}44` }}>
            {cls.name}
          </div>
          <div className="italic-serif" style={{ fontSize: 15, color: 'var(--text-dim)' }}>
            Hit Die <span style={{ color: cls.color }}>d{cls.hitDie}</span> &nbsp;·&nbsp;
            Primary <span style={{ color: cls.color }}>{cls.primary}</span> &nbsp;·&nbsp;
            Saves <span style={{ color: cls.color }}>{cls.saves.join(', ')}</span>
          </div>
        </div>
      </div>

      <p className="body-prose" style={{ marginBottom: 18 }}>
        {cls.blurb}
      </p>

      <div style={{
        padding: 16, borderLeft: `3px solid ${cls.color}`,
        background: `linear-gradient(90deg, ${cls.color}14, transparent 80%)`,
        borderRadius: 4,
      }}>
        <div className="label" style={{ color: cls.color, marginBottom: 4 }}>✦ Playstyle</div>
        <div className="italic-serif" style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.55 }}>
          {cls.playstyle}
        </div>
      </div>
    </div>
  );
}

function classFamily(cls) {
  // Flavor label above the class name
  const map = {
    barbarian: 'Primal',
    bard: 'Lyric',
    cleric: 'Divine',
    druid: 'Wild',
    fighter: 'Steelborn',
    monk: 'Disciplined',
    paladin: 'Sworn',
    ranger: 'Wandering',
    rogue: 'Roguish',
    sorcerer: 'Innate',
    warlock: 'Pact-Bound',
    wizard: 'Studied',
  };
  return map[cls.id] || cls.subclassName;
}

function SubclassChapter({ cls, data, update }) {
  const isPatron = cls.hasPatron;
  const availableNow = (data.level || 1) >= cls.subclassLevel;
  return (
    <div>
      <OrnateHeading color={cls.color}>{isPatron ? 'Otherworldly Patron' : cls.subclassName}</OrnateHeading>

      <div className="italic-serif" style={{ fontSize: 14, textAlign: 'center', color: availableNow ? 'var(--teal)' : 'var(--text-dim)', marginBottom: 18 }}>
        {availableNow
          ? `Active at your current level (${data.level || 1}).`
          : `Unlocks at level ${cls.subclassLevel} — pick now to plan your build.`}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: cls.subclasses.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 12 }}>
        {cls.subclasses.map(s => (
          <button
            key={s.id}
            onClick={() => update({ subclass: s.id, patron: isPatron ? s.id : data.patron })}
            className={`pickable ${data.subclass === s.id ? 'selected' : ''}`}
            style={{ padding: 16, textAlign: 'left', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            <div className="display" style={{ fontSize: 18, color: 'var(--text)' }}>{s.name}</div>
            <div className="italic-serif" style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5, flex: 1 }}>
              {s.desc}
            </div>
            {s.best && (
              <div style={{ fontSize: 12, color: cls.color, marginTop: 4, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
                ✦ Best for: {s.best}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// BONDS TOME — patrons, deities, companions, mounts with full image+name+desc
// ============================================================================
function BondsTome({ cls, data, update }) {
  const bonds = bondsForClass(cls, data);
  if (bonds.length === 0) return null;

  return (
    <div className="tome" style={{ padding: '32px 36px' }}>
      <OrnateHeading color={cls.color}>Bonds &amp; Allies</OrnateHeading>
      <div className="italic-serif" style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 15, marginBottom: 22, maxWidth: 600, margin: '0 auto 22px' }}>
        Your hero doesn't walk alone. Detail the beings — divine, infernal, animal — that shape their power.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {bonds.map((bond, i) => (
          <AllyCard
            key={bond.key}
            bond={bond}
            cls={cls}
            data={data}
            update={update}
          />
        ))}
      </div>
    </div>
  );
}

function bondsForClass(cls, data) {
  const allies = data.allies || {};
  const bonds = [];

  if (cls.id === 'warlock') {
    const patronSub = cls.subclasses.find(s => s.id === data.subclass);
    bonds.push({
      key: 'patron',
      label: 'Your Patron',
      kicker: 'The being you serve',
      presetOptions: cls.subclasses.map(s => ({ id: s.id, name: s.name, desc: s.desc })),
      preset: patronSub ? { name: patronSub.name, desc: patronSub.desc } : null,
      placeholder: 'Asmodeus, Mab, the Whisper Beyond...',
      descPlaceholder: 'What do they want from you? How did the pact form?',
    });
    bonds.push({
      key: 'familiar',
      label: 'Pact of the Chain Familiar',
      kicker: 'Optional — unlocks at level 3 with Pact of the Chain',
      presetOptions: cls.companions.map(c => ({ id: c.id, name: c.name, desc: c.desc })),
      preset: cls.companions.find(c => c.id === data.companion),
      placeholder: 'Wisp, Shadowclaw, Bound-In-Chains...',
      descPlaceholder: 'What does it look like? What does it whisper?',
    });
  }

  if (cls.id === 'ranger') {
    bonds.push({
      key: 'companion',
      label: 'Animal Companion',
      kicker: 'Beast Master ranger — unlocks at level 3',
      presetOptions: cls.companions.map(c => ({ id: c.id, name: c.name, desc: c.desc })),
      preset: cls.companions.find(c => c.id === data.companion),
      placeholder: 'Rangefur, Talonshine, Old Boar...',
      descPlaceholder: 'How did they bond? What\'s their personality?',
    });
  }

  if (cls.id === 'paladin') {
    bonds.push({
      key: 'deity',
      label: 'Your Deity',
      kicker: 'The power your oath is sworn to',
      placeholder: 'Bahamut, the Dawnflower, the Silent Watcher...',
      descPlaceholder: 'What does your deity stand for? What rites do you keep?',
    });
    bonds.push({
      key: 'mount',
      label: 'Celestial Mount',
      kicker: 'Optional — unlocks via Find Steed at level 5',
      placeholder: 'Brightmane, Stormhoof, Last-Sunrise...',
      descPlaceholder: 'Pegasus, warhorse, dire wolf — what answers your call?',
    });
  }

  if (cls.id === 'cleric') {
    const domainSub = cls.subclasses.find(s => s.id === data.subclass);
    bonds.push({
      key: 'deity',
      label: 'Your Deity',
      kicker: domainSub ? `Chosen of the ${domainSub.name}` : 'The god whose miracles you channel',
      placeholder: 'Pelor, Moradin, the Raven Queen...',
      descPlaceholder: 'What does your god demand? What do you preach?',
    });
  }

  if (cls.id === 'druid') {
    bonds.push({
      key: 'circle',
      label: 'Your Druidic Circle',
      kicker: 'The grove or order that taught you',
      placeholder: 'Circle of the Iron Birch, the Tidal Court...',
      descPlaceholder: 'Where do you gather? What rites do you observe?',
    });
  }

  if (cls.id === 'sorcerer') {
    const origin = cls.subclasses.find(s => s.id === data.subclass);
    bonds.push({
      key: 'origin',
      label: 'Source of your magic',
      kicker: origin ? origin.name : 'The wellspring of your power',
      preset: origin ? { name: origin.name, desc: origin.desc } : null,
      placeholder: 'My dragon ancestor Vrazak, a wild surge in the womb...',
      descPlaceholder: 'How does the magic feel? Does it want anything?',
    });
  }

  return bonds;
}

function AllyCard({ bond, cls, data, update }) {
  const allies = data.allies || {};
  const ally = allies[bond.key] || {};
  const setAlly = (patch) => {
    update({ allies: { ...allies, [bond.key]: { ...ally, ...patch } } });
  };

  // Auto-fill name/desc from preset if user hasn't typed anything yet
  const effectiveName = ally.name ?? bond.preset?.name ?? '';
  const effectiveDesc = ally.desc ?? bond.preset?.desc ?? '';

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '160px 1fr',
      gap: 20,
      padding: 20,
      background: `linear-gradient(135deg, ${cls.color}0E, transparent 70%)`,
      border: `1px solid ${cls.color}33`,
      borderLeft: `3px solid ${cls.color}`,
      borderRadius: 6,
    }}>
      <div>
        <PortraitUpload
          src={ally.image}
          onChange={(img) => setAlly({ image: img })}
          shape="rounded"
          height={160}
          placeholder="Drop their likeness"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div className="label" style={{ color: cls.color, marginBottom: 4 }}>{bond.kicker}</div>
          <div className="display" style={{ fontSize: 22, color: 'var(--text)' }}>{bond.label}</div>
        </div>

        {bond.presetOptions && bond.presetOptions.length > 0 && (
          <PresetPicker
            options={bond.presetOptions}
            current={ally.presetId}
            color={cls.color}
            onPick={(opt) => setAlly({
              presetId: opt.id,
              name: ally.name?.trim() ? ally.name : opt.name,
              desc: ally.desc?.trim() ? ally.desc : opt.desc,
            })}
          />
        )}

        <div>
          <div className="label" style={{ marginBottom: 4, color: 'var(--text-dim)' }}>Name</div>
          <input
            className="input"
            value={effectiveName}
            onChange={(e) => setAlly({ name: e.target.value })}
            placeholder={bond.placeholder}
            style={{ fontFamily: 'var(--display)', fontSize: 18 }}
          />
        </div>

        <div>
          <div className="label" style={{ marginBottom: 4, color: 'var(--text-dim)' }}>Description</div>
          <textarea
            className="input italic-serif"
            value={effectiveDesc}
            onChange={(e) => setAlly({ desc: e.target.value })}
            placeholder={bond.descPlaceholder}
            rows={3}
            style={{ resize: 'vertical', minHeight: 70, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 14, lineHeight: 1.5 }}
          />
        </div>
      </div>
    </div>
  );
}

function PresetPicker({ options, current, color, onPick }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 6, color: 'var(--text-dim)' }}>Pick a preset (you can edit)</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map(opt => {
          const active = current === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onPick(opt)}
              style={{
                all: 'unset', cursor: 'pointer',
                padding: '6px 12px', borderRadius: 999,
                fontSize: 12, fontWeight: 700,
                background: active ? color : 'transparent',
                color: active ? 'white' : 'var(--text-dim)',
                border: `1px solid ${active ? color : 'var(--border)'}`,
                transition: 'all .15s',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = color; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              {opt.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// CLASS ROSTER (right rail)
// ============================================================================
function ClassRoster({ current, onPick }) {
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="label" style={{ marginBottom: 12 }}>The Twelve Callings</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {CLASSES.map(c => {
          const active = c.id === current;
          return (
            <button
              key={c.id}
              onClick={() => onPick(c.id)}
              title={c.name}
              style={{
                all: 'unset', cursor: 'pointer',
                padding: '10px 4px', textAlign: 'center',
                borderRadius: 4, transition: 'all .2s',
                background: active ? `${c.color}1F` : 'transparent',
                border: `1px solid ${active ? c.color : 'transparent'}`,
                boxShadow: active ? `0 0 14px ${c.color}40` : 'none',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(212, 169, 81, 0.06)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                fontSize: 22, lineHeight: 1, marginBottom: 4,
                filter: active ? 'none' : 'grayscale(0.4) opacity(0.75)',
                transition: 'filter .2s',
              }}>{c.icon}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: active ? c.color : 'var(--text-dim)', letterSpacing: 0.3 }}>
                {c.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// CLASS BUILD SUMMARY (right rail)
// ============================================================================
function ClassBuildSummary({ cls, data }) {
  const subcls = cls.subclasses.find(s => s.id === data.subclass);
  return (
    <div className="panel-strong" style={{ padding: 18, position: 'relative' }}>
      <div className="tome-corner tr"></div>
      <div className="tome-corner bl"></div>

      <div className="ornate-heading" style={{ marginBottom: 16 }}>
        <span className="ornate-flourish small" style={{ background: cls.color }}></span>
        <h3 style={{ fontSize: 18, color: 'var(--text)' }}>{cls.name} build</h3>
        <span className="ornate-flourish small" style={{ background: cls.color }}></span>
      </div>

      <SummaryRow label="Hit Die" value={`d${cls.hitDie}`} />
      <SummaryRow label="Saves" value={cls.saves.join(', ')} />
      <SummaryRow label="Caster" value={cls.spellcaster ? (cls.spellcaster === 'full' ? 'Full' : cls.spellcaster === 'pact' ? 'Pact magic' : 'Half') : '—'} />
      {subcls && <SummaryRow label={cls.subclassName} value={subcls.name} />}
      {data.allies?.deity?.name && <SummaryRow label="Deity" value={data.allies.deity.name} />}
      {data.allies?.patron?.name && <SummaryRow label="Patron" value={data.allies.patron.name} />}
      {data.allies?.familiar?.name && <SummaryRow label="Familiar" value={data.allies.familiar.name} />}
      {data.allies?.companion?.name && <SummaryRow label="Companion" value={data.allies.companion.name} />}
      {data.allies?.mount?.name && <SummaryRow label="Mount" value={data.allies.mount.name} />}

      <div style={{ marginTop: 16 }}>
        <div className="label" style={{ marginBottom: 8 }}>Features at L{data.level || 1}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {cls.features.filter(f => f.level <= (data.level || 1)).map(f => (
            <div key={f.name} style={{ fontSize: 13, color: 'var(--text)', display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ color: cls.color }}>◆</span>
              <span style={{ fontWeight: 700 }}>{f.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.StepClass = StepClass;
