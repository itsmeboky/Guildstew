// Step 7: Equipment — starting gear, currency, and free-form inventory.

function StepEquipment({ data, update }) {
  const cls = CLASSES.find(c => c.id === data.class);
  const startEq = cls ? CLASS_EQUIPMENT[cls.id] : null;
  const equipChoices = data.equipment_choices || {};
  const currency = data.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  const customItems = data.inventory_custom || [];
  const [newItem, setNewItem] = useState('');

  const pickChoice = (label, option) => update({ equipment_choices: { ...equipChoices, [label]: option } });

  const useStartingGold = () => {
    // Set a flag and zero out the kit
    update({ used_starting_gold: !data.used_starting_gold });
  };

  return (
    <div className="step-content">
      <StepHeader
        kicker="Step 7 of 8"
        title="Pack your gear"
        subtitle="Your class starts you with a kit. You can also roll for gold instead and shop later."
      />

      <Primer title="How starting equipment works">
        Every class hands you a <strong style={{ color: 'var(--text)' }}>starter pack</strong> for free — armor, a weapon, tools, supplies. Some slots have a choice (longsword OR rapier?). When in doubt, take the one that matches your highest stat. Want to shop instead? Toggle "Use starting gold" and roll for coin.
      </Primer>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24, marginTop: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {startEq && !data.used_starting_gold && (
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 className="display" style={{ fontSize: 22, color: 'var(--text)' }}>{cls.name} starter kit</h3>
                <button className="btn btn-ghost" onClick={useStartingGold} style={{ fontSize: 12, padding: '6px 12px' }}>
                  💰 Use starting gold instead ({startEq.gold})
                </button>
              </div>

              {startEq.fixed.length > 0 && (
                <>
                  <div className="label" style={{ marginBottom: 8 }}>Included automatically</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                    {startEq.fixed.map(item => (
                      <span key={item} className="chip" style={{ fontSize: 12 }}>✓ {item}</span>
                    ))}
                  </div>
                </>
              )}

              {startEq.choices.length > 0 && (
                <>
                  <div className="label" style={{ marginBottom: 8 }}>Pick one from each row</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {startEq.choices.map((c, i) => (
                      <ChoiceRow key={i} c={c} value={equipChoices[c.label]} onPick={(v) => pickChoice(c.label, v)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {data.used_starting_gold && (
            <div className="panel" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
                <h3 className="display" style={{ fontSize: 22, color: 'var(--text)' }}>Rolled starting gold</h3>
                <button className="btn btn-ghost" onClick={useStartingGold} style={{ fontSize: 12, padding: '6px 12px' }}>
                  ← Back to starter kit
                </button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14 }}>
                You'll be given {startEq.gold} to spend on gear of your choice. Roll it now or set a custom amount.
              </p>
              <RolledGold formula={startEq.gold} currency={currency} update={(gp) => update({ currency: { ...currency, gp } })} />
            </div>
          )}

          <CustomInventory
            items={customItems}
            newItem={newItem}
            setNewItem={setNewItem}
            onAdd={() => {
              if (newItem.trim()) {
                update({ inventory_custom: [...customItems, newItem.trim()] });
                setNewItem('');
              }
            }}
            onRemove={(i) => update({ inventory_custom: customItems.filter((_, idx) => idx !== i) })}
          />

          <CurrencyPanel currency={currency} update={(c) => update({ currency: c })} />
        </div>

        <div style={{ position: 'sticky', top: 20, alignSelf: 'flex-start' }}>
          <CharacterSummary data={data} />
          <div style={{ height: 12 }} />
          <PackingList data={data} cls={cls} startEq={startEq} equipChoices={equipChoices} customItems={customItems} />
        </div>
      </div>
    </div>
  );
}

function ChoiceRow({ c, value, onPick }) {
  return (
    <div style={{ background: 'rgba(11,19,28,0.5)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
      <div className="label" style={{ marginBottom: 8 }}>{c.label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${c.options.length}, 1fr)`, gap: 6 }}>
        {c.options.map(opt => (
          <button
            key={opt}
            onClick={() => onPick(opt)}
            className={`pickable ${value === opt ? 'selected-teal' : ''}`}
            style={{ padding: '8px 10px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'inherit' }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function RolledGold({ formula, currency, update }) {
  const roll = () => {
    // parse "4d4 × 10 gp" etc
    const match = formula.match(/(\d+)d(\d+)(?:\s*[×x]\s*(\d+))?/);
    if (!match) return;
    const count = +match[1], die = +match[2], mult = +match[3] || 1;
    let total = 0;
    for (let i = 0; i < count; i++) total += Math.floor(Math.random() * die) + 1;
    update(total * mult);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button className="btn btn-primary" onClick={roll}>🎲 Roll {formula}</button>
      <div style={{ flex: 1 }}>
        <div className="label" style={{ marginBottom: 4 }}>Gold</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="number" className="input" value={currency.gp || 0} onChange={(e) => update(Number(e.target.value) || 0)} style={{ width: 100, textAlign: 'right' }} />
          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>gp</span>
        </div>
      </div>
    </div>
  );
}

function CustomInventory({ items, newItem, setNewItem, onAdd, onRemove }) {
  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="display" style={{ fontSize: 22, color: 'var(--text)' }}>Personal items</h3>
        <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{items.length} item{items.length !== 1 && 's'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          className="input"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          placeholder="e.g. Locket from my mother, A worn diary, Lucky coin..."
        />
        <button className="btn btn-teal" onClick={onAdd} disabled={!newItem.trim()}>Add</button>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>
          Optional. Add trinkets, sentimental items, or anything your character carries that the rules don't track.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(11,19,28,0.5)', borderRadius: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text)' }}>{it}</span>
              <button onClick={() => onRemove(i)} style={{ all: 'unset', cursor: 'pointer', color: 'var(--text-faint)', fontSize: 14, padding: 4 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CurrencyPanel({ currency, update }) {
  const coins = [
    { id: 'cp', name: 'Copper', color: '#B87333' },
    { id: 'sp', name: 'Silver', color: '#C0C0C0' },
    { id: 'ep', name: 'Electrum', color: '#A8C5A6' },
    { id: 'gp', name: 'Gold', color: '#F2B33D' },
    { id: 'pp', name: 'Platinum', color: '#E5E4E2' },
  ];
  return (
    <div className="panel" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="display" style={{ fontSize: 22, color: 'var(--text)' }}>Coin purse</h3>
        <HelpTip>1 platinum = 10 gold = 100 silver = 1000 copper. Electrum is 5 silver. Most adventurers use gold.</HelpTip>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {coins.map(c => (
          <div key={c.id} style={{ background: 'rgba(11,19,28,0.5)', padding: 10, borderRadius: 8, borderTop: `2px solid ${c.color}` }}>
            <div style={{ fontSize: 11, color: c.color, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{c.id}</div>
            <input
              type="number" min={0}
              value={currency[c.id] || 0}
              onChange={(e) => update({ ...currency, [c.id]: Math.max(0, Number(e.target.value) || 0) })}
              className="input"
              style={{ padding: '6px 10px', fontSize: 14, fontWeight: 700, textAlign: 'center' }}
            />
            <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4, textAlign: 'center' }}>{c.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PackingList({ data, cls, startEq, equipChoices, customItems }) {
  if (!cls) return null;
  const allItems = [
    ...(startEq && !data.used_starting_gold ? startEq.fixed : []),
    ...(startEq && !data.used_starting_gold ? Object.values(equipChoices) : []),
    ...customItems,
  ].filter(Boolean);
  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="label" style={{ marginBottom: 12 }}>Packing list</div>
      {allItems.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>Pick gear above to fill your pack.</div>
      ) : (
        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          {allItems.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      )}
    </div>
  );
}

window.StepEquipment = StepEquipment;
