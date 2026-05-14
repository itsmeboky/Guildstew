import { useMemo, useState } from "react";
import { Plus, Trash2, Search, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { STARTING_EQUIPMENT } from "@/components/dnd5e/dnd5eRules";
import { getGamePack } from "@/data/games";
import { safeText } from "@/utils/safeRender";
import { isLockedInventoryItem } from "@/config/cipherInventoryItems";
import { motion } from "framer-motion";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { OrnateHeading, FleurDivider } from "@/components/characterCreator/chrome/Ornaments";
import { CharacterSummary } from "@/components/characterCreator/chrome/CharacterSummary";

// STARTING_EQUIPMENT[class].choices is an array of objects like
// { option1: 'Mace', option2: 'Warhammer (if proficient)' } — one
// "choose one" per entry. Normalise to an option-string list so
// the UI can render buttons.
function optionsForChoice(choice) {
  if (!choice) return [];
  if (Array.isArray(choice)) return choice.flat().filter(Boolean);
  return Object.keys(choice)
    .filter((k) => /^option\d+$/i.test(k))
    .map((k) => choice[k])
    .filter(Boolean);
}

const ITEM_TYPE_FILTERS = [
  { value: "all",              label: "All types" },
  { value: "weapon",           label: "Weapons" },
  { value: "armor",            label: "Armor" },
  { value: "adventuring gear", label: "Gear" },
  { value: "tool",             label: "Tools" },
];

const COINS = [
  { id: 'cp', name: 'Copper',   color: '#B87333' },
  { id: 'sp', name: 'Silver',   color: '#C0C0C0' },
  { id: 'ep', name: 'Electrum', color: '#A8C5A6' },
  { id: 'gp', name: 'Gold',     color: '#F2B33D' },
  { id: 'pp', name: 'Platinum', color: '#E5E4E2' },
];

export default function EquipmentStep({ characterData, updateCharacterData }) {
  const classKey = characterData.class;
  const entry = classKey ? STARTING_EQUIPMENT[classKey] : null;
  const fixedItems = entry?.fixed || [];
  const choices = useMemo(
    () => (entry?.choices || []).map(optionsForChoice),
    [entry],
  );

  const [selectedChoices, setSelectedChoices] = useState(
    Array.from({ length: choices.length }, (_, i) => (choices[i]?.[0] ?? "")),
  );

  const allItems = useMemo(() => {
    const gamePackId = characterData.gamePack || "dnd5e_2014";
    return getGamePack(gamePackId).getEquipment();
  }, [characterData.gamePack]);

  const [showItemBrowser, setShowItemBrowser] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("all");

  const inventory = Array.isArray(characterData.inventory) ? characterData.inventory : [];

  const addInventoryItem = () => {
    updateCharacterData({
      inventory: [...inventory, { name: "", quantity: 1, weight: 0, description: "" }],
    });
  };

  const removeInventoryItem = (index) => {
    const target = inventory[index];
    if (isLockedInventoryItem(target)) {
      toast.error(`${target.name} is bound to your class — it can't be removed.`);
      return;
    }
    updateCharacterData({ inventory: inventory.filter((_, i) => i !== index) });
  };

  const updateInventoryItem = (index, field, value) => {
    const next = inventory.slice();
    next[index] = { ...next[index], [field]: value };
    updateCharacterData({ inventory: next });
  };

  const addItemFromBrowser = (item) => {
    const weight = Number(item?.properties?.weight ?? item?.properties?._raw?.weight ?? 0) || 0;
    const description = typeof item?.description === "string" ? item.description.slice(0, 240) : "";
    updateCharacterData({
      inventory: [...inventory, { name: item.name, quantity: 1, weight, description }],
    });
    toast.success(`Added ${item.name}`);
  };

  const applyStartingEquipment = () => {
    const picked = selectedChoices.filter(Boolean);
    const all = [...fixedItems, ...picked];
    const items = all.map((name) => ({ name, quantity: 1, weight: 0, description: "" }));
    updateCharacterData({ inventory: [...inventory, ...items] });
    toast.success("Starting equipment added to inventory.");
  };

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    const type = itemTypeFilter;
    return (allItems || [])
      .filter((item) => {
        const nameMatch = !q || String(item.name || "").toLowerCase().includes(q);
        const itemType = String(item.type || item.category || "").toLowerCase();
        const typeMatch = type === "all" || itemType.includes(type);
        return nameMatch && typeMatch;
      })
      .slice(0, 50);
  }, [allItems, itemSearch, itemTypeFilter]);

  const totalWeight = inventory.reduce(
    (sum, item) => sum + (Number(item.weight) || 0) * (Number(item.quantity) || 1),
    0,
  );

  return (
    <div>
      <StepHeader
        kicker="Chapter VII · The Pack"
        title="Pack your gear"
        subtitle="Your class starts you with a kit. Browse the bazaar, scribble in personal items, then count your coin."
      />

      <Primer title="How starting equipment works">
        Every class hands you a <strong>starter pack</strong> for free — armor, a weapon, tools,
        supplies. Some slots have a choice (longsword <em>or</em> rapier?). Pick one from each
        choice row, then click <strong>Add starting equipment</strong> to drop them into your
        inventory below.
      </Primer>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.6fr 1fr',
          gap: 24,
          marginTop: 24,
          alignItems: 'flex-start',
        }}
      >
        {/* LEFT — kit + browser + inventory + currency */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {classKey && entry && (
            <StartingKitPanel
              classKey={classKey}
              fixedItems={fixedItems}
              choices={choices}
              selectedChoices={selectedChoices}
              onPick={(idx, option) => {
                const next = selectedChoices.slice();
                next[idx] = option;
                setSelectedChoices(next);
              }}
              onApply={applyStartingEquipment}
              startingGold={entry.startingGold}
            />
          )}

          <ItemBrowserPanel
            open={showItemBrowser}
            onToggle={() => setShowItemBrowser((v) => !v)}
            search={itemSearch}
            onSearchChange={setItemSearch}
            typeFilter={itemTypeFilter}
            onTypeChange={setItemTypeFilter}
            filteredItems={filteredItems}
            onAdd={addItemFromBrowser}
          />

          <InventoryPanel
            inventory={inventory}
            totalWeight={totalWeight}
            onAdd={addInventoryItem}
            onRemove={removeInventoryItem}
            onUpdate={updateInventoryItem}
          />

          <CoinPursePanel
            currency={characterData.currency || {}}
            onChange={(coin, value) =>
              updateCharacterData({
                currency: {
                  ...characterData.currency,
                  [coin]: Math.max(0, parseInt(value, 10) || 0),
                },
              })
            }
          />
        </div>

        {/* RIGHT — character summary + packing list preview */}
        <div
          style={{
            position: 'sticky',
            top: 20,
            alignSelf: 'flex-start',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <CharacterSummary data={characterData} />
          <PackingListPanel
            inventory={inventory}
            currency={characterData.currency || {}}
            totalWeight={totalWeight}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Starting kit panel — fixed items chip row + choice rows + apply button
// ============================================================================
function StartingKitPanel({
  classKey, fixedItems, choices, selectedChoices, onPick, onApply, startingGold,
}) {
  return (
    <div className="cc-tome" style={{ padding: '28px 32px' }}>
      <OrnateHeading>{classKey} starter kit</OrnateHeading>

      {fixedItems.length > 0 && (
        <>
          <div
            className="cc-label"
            style={{ marginBottom: 8, color: 'var(--cc-gold-soft)' }}
          >
            Included automatically
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginBottom: 18,
            }}
          >
            {fixedItems.map((item, idx) => (
              <span key={idx} className="cc-chip cc-chip-teal">
                <Check className="w-3 h-3" /> {item}
              </span>
            ))}
          </div>
        </>
      )}

      {choices.length > 0 && (
        <>
          <FleurDivider />
          <div
            className="cc-label"
            style={{ marginBottom: 10, color: 'var(--cc-gold-soft)' }}
          >
            Pick one from each row
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {choices.map((opts, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(20, 12, 8, 0.5)',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--cc-border)',
                }}
              >
                <div
                  className="cc-label"
                  style={{ marginBottom: 8, color: 'var(--cc-text-dim)' }}
                >
                  Choice {idx + 1}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${Math.min(opts.length, 3)}, 1fr)`,
                    gap: 6,
                  }}
                >
                  {opts.map((option) => {
                    const isSelected = selectedChoices[idx] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => onPick(idx, option)}
                        className={`cc-pickable ${isSelected ? 'cc-selected-teal' : ''}`}
                        style={{
                          padding: '10px 12px',
                          textAlign: 'center',
                          fontSize: 13,
                          fontWeight: 600,
                          color: isSelected ? 'var(--cc-teal)' : 'var(--cc-text)',
                        }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onApply}
          className="cc-btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'linear-gradient(180deg, var(--cc-teal), color-mix(in srgb, var(--cc-teal), black 18%))',
            color: '#050816',
            border: '1px solid color-mix(in srgb, var(--cc-teal), black 30%)',
          }}
        >
          <Sparkles className="w-4 h-4" />
          Add starting equipment to inventory
        </button>
        {startingGold && (
          <span
            className="cc-italic-serif"
            style={{
              fontSize: 12,
              color: 'var(--cc-text-faint)',
            }}
          >
            Or roll {startingGold.dice} × {startingGold.multiplier} gp instead and shop in the
            bazaar below.
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Item browser — searchable shop drawer
// ============================================================================
function ItemBrowserPanel({
  open, onToggle, search, onSearchChange, typeFilter, onTypeChange,
  filteredItems, onAdd,
}) {
  return (
    <div className="cc-panel" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: open ? 14 : 0,
          gap: 10,
        }}
      >
        <h3
          className="cc-display"
          style={{ fontSize: 20, color: 'var(--cc-text)', margin: 0 }}
        >
          The bazaar
        </h3>
        <button
          type="button"
          onClick={onToggle}
          className="cc-btn-ghost"
          style={{ fontSize: 12, padding: '6px 14px' }}
        >
          {open ? 'Hide' : 'Browse items'}
        </button>
      </div>

      {open && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                className="w-4 h-4"
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--cc-text-faint)',
                }}
              />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search items…"
                className="cc-input"
                style={{ paddingLeft: 32 }}
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => onTypeChange(e.target.value)}
              className="cc-input"
              style={{ width: 160 }}
            >
              {ITEM_TYPE_FILTERS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div
            style={{
              maxHeight: 320,
              overflowY: 'auto',
              background: 'rgba(20, 12, 8, 0.45)',
              border: '1px solid var(--cc-border)',
              borderRadius: 8,
            }}
          >
            {filteredItems.length === 0 ? (
              <p
                className="cc-italic-serif"
                style={{
                  fontSize: 13,
                  color: 'var(--cc-text-faint)',
                  textAlign: 'center',
                  padding: 16,
                  margin: 0,
                }}
              >
                No items match these filters.
              </p>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onAdd(item)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--cc-border-faint)',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 169, 81, 0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      minWidth: 0,
                    }}
                  >
                    {item.icon_url ? (
                      <img
                        src={item.icon_url}
                        alt=""
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          background: 'rgba(20, 12, 8, 0.7)',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span
                      style={{
                        fontSize: 13,
                        color: 'var(--cc-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {safeText(item.name)}
                    </span>
                    {item.type && (
                      <span
                        className="cc-label"
                        style={{ fontSize: 9, color: 'var(--cc-text-faint)' }}
                      >
                        {safeText(item.type)}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexShrink: 0,
                    }}
                  >
                    {item.cost && (
                      <span style={{ fontSize: 11, color: 'var(--cc-gold-soft)' }}>
                        {typeof item.cost === 'string' ? item.cost : safeText(item.cost)}
                      </span>
                    )}
                    <Plus className="w-4 h-4" style={{ color: 'var(--cc-teal)' }} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Inventory editor — name / qty / weight / notes / remove
// ============================================================================
function InventoryPanel({ inventory, totalWeight, onAdd, onRemove, onUpdate }) {
  return (
    <div className="cc-panel" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <h3
          className="cc-display"
          style={{ fontSize: 20, color: 'var(--cc-text)', margin: 0 }}
        >
          Personal items
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            className="cc-italic-serif"
            style={{ fontSize: 12, color: 'var(--cc-text-faint)' }}
          >
            {inventory.length} item{inventory.length !== 1 ? 's' : ''} ·{' '}
            {totalWeight.toFixed(1)} lb
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="cc-btn-primary"
            style={{
              fontSize: 12,
              padding: '6px 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus className="w-4 h-4" /> Add item
          </button>
        </div>
      </div>

      {inventory.length === 0 ? (
        <p
          className="cc-italic-serif"
          style={{
            fontSize: 13,
            color: 'var(--cc-text-faint)',
            textAlign: 'center',
            padding: 16,
            margin: 0,
          }}
        >
          Your pack is empty. Drop in starting equipment, browse the bazaar, or add personal
          items above.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {inventory.map((item, index) => {
            const locked = isLockedInventoryItem(item);
            return (
              <div
                key={index}
                style={{
                  background: 'rgba(20, 12, 8, 0.45)',
                  border: `1px solid ${locked ? 'var(--cc-gold)' : 'var(--cc-border)'}`,
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '5fr 1.5fr 1.5fr 4fr auto',
                    gap: 8,
                    alignItems: 'center',
                  }}
                >
                  <input
                    value={item.name}
                    onChange={(e) => onUpdate(index, 'name', e.target.value)}
                    placeholder="Item name"
                    className="cc-input"
                    disabled={locked}
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onUpdate(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                    placeholder="Qty"
                    className="cc-input"
                    style={{ textAlign: 'center' }}
                  />
                  <input
                    type="number"
                    value={item.weight}
                    onChange={(e) => onUpdate(index, 'weight', parseFloat(e.target.value) || 0)}
                    placeholder="lb"
                    className="cc-input"
                    style={{ textAlign: 'center' }}
                  />
                  <input
                    value={item.description || ''}
                    onChange={(e) => onUpdate(index, 'description', e.target.value)}
                    placeholder="Notes"
                    className="cc-input"
                  />
                  <button
                    type="button"
                    onClick={() => onRemove(index)}
                    disabled={locked}
                    title={locked ? 'Class-bound — cannot be removed' : 'Remove item'}
                    style={{
                      all: 'unset',
                      cursor: locked ? 'not-allowed' : 'pointer',
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: locked ? 'var(--cc-text-faint)' : 'var(--cc-orange)',
                      border: `1px solid ${locked ? 'var(--cc-border-faint)' : 'var(--cc-orange)'}`,
                      opacity: locked ? 0.4 : 1,
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {locked && (
                  <div
                    className="cc-italic-serif"
                    style={{
                      fontSize: 11,
                      color: 'var(--cc-gold-soft)',
                      marginTop: 6,
                    }}
                  >
                    Bound to your class — survives session reloads.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Coin purse — five colored coin slots
// ============================================================================
function CoinPursePanel({ currency, onChange }) {
  return (
    <div className="cc-panel" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
          gap: 10,
        }}
      >
        <h3
          className="cc-display"
          style={{ fontSize: 20, color: 'var(--cc-text)', margin: 0 }}
        >
          Coin purse
        </h3>
        <span
          className="cc-italic-serif"
          style={{ fontSize: 11, color: 'var(--cc-text-faint)' }}
        >
          1 pp = 10 gp = 100 sp = 1000 cp · electrum = 5 sp
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 8,
        }}
      >
        {COINS.map((c) => (
          <div
            key={c.id}
            style={{
              background: 'rgba(20, 12, 8, 0.55)',
              padding: 10,
              borderRadius: 8,
              borderTop: `3px solid ${c.color}`,
              border: '1px solid var(--cc-border)',
            }}
          >
            <div
              className="cc-label"
              style={{
                color: c.color,
                marginBottom: 4,
                fontSize: 10,
              }}
            >
              {c.id}
            </div>
            <input
              type="number"
              min="0"
              value={currency[c.id] || 0}
              onChange={(e) => onChange(c.id, e.target.value)}
              className="cc-input"
              style={{
                padding: '6px 8px',
                fontSize: 14,
                fontWeight: 700,
                textAlign: 'center',
              }}
            />
            <div
              style={{
                fontSize: 10,
                color: 'var(--cc-text-faint)',
                marginTop: 4,
                textAlign: 'center',
              }}
            >
              {c.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Packing list — right rail preview of what's in the pack
// ============================================================================
function PackingListPanel({ inventory, currency, totalWeight }) {
  const totalGoldEquiv =
    (Number(currency.cp) || 0) / 100
    + (Number(currency.sp) || 0) / 10
    + (Number(currency.ep) || 0) / 2
    + (Number(currency.gp) || 0)
    + (Number(currency.pp) || 0) * 10;

  return (
    <div className="cc-panel" style={{ padding: 16 }}>
      <div className="cc-label" style={{ marginBottom: 10, color: 'var(--cc-gold-soft)' }}>
        Packing list
      </div>

      {inventory.length === 0 ? (
        <div
          className="cc-italic-serif"
          style={{
            fontSize: 12,
            color: 'var(--cc-text-faint)',
          }}
        >
          Pick gear to fill your pack.
        </div>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: '0 0 0 18px',
            fontSize: 12,
            color: 'var(--cc-text-dim)',
            lineHeight: 1.7,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {inventory
            .filter((it) => it?.name)
            .map((it, i) => (
              <li key={i}>
                {it.name}
                {it.quantity > 1 && (
                  <span style={{ color: 'var(--cc-text-faint)' }}> ×{it.quantity}</span>
                )}
              </li>
            ))}
        </ul>
      )}

      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--cc-border-faint)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          fontSize: 11,
          color: 'var(--cc-text-dim)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total weight</span>
          <span style={{ color: 'var(--cc-text)', fontWeight: 600 }}>
            {totalWeight.toFixed(1)} lb
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Treasury</span>
          <span style={{ color: 'var(--cc-gold)', fontWeight: 600 }}>
            {totalGoldEquiv.toFixed(1)} gp
          </span>
        </div>
      </div>
    </div>
  );
}
