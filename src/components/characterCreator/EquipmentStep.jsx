import { useMemo, useState } from "react";
import { Plus, Trash2, Search, Check, Dices, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { STARTING_EQUIPMENT } from "@/components/dnd5e/dnd5eRules";
import { getGamePack } from "@/data/games";
import { buildStartingKit, classifyType } from "@/components/characterCreator/startingKit";
import { safeText } from "@/utils/safeRender";
import { isLockedInventoryItem } from "@/config/cipherInventoryItems";
import { HelpTip } from "@/components/characterCreator/chrome/HelpTip";
import { StepHeader } from "@/components/characterCreator/chrome/StepHeader";
import { Primer } from "@/components/characterCreator/chrome/Primer";
import { CharacterSummary } from "@/components/characterCreator/chrome/CharacterSummary";

// ============================================================================
// Step 7: Equipment — exact port of step-equipment.jsx.
//
// Layout: 1.6fr / 1fr grid.
//   Left: StartingKitPanel (with "Use starting gold instead" toggle that
//   swaps in a RolledGold panel) → ItemBrowserPanel (collapsible bazaar) →
//   InventoryPanel (locked-item-protected editor) → CurrencyPanel.
//   Right (sticky): CharacterSummary + PackingListPanel.
// ============================================================================

// STARTING_EQUIPMENT[class].choices entries look like
// { option1: 'Mace', option2: 'Warhammer (if proficient)' }. Normalise to a
// plain string-list so the .pickable buttons render naturally.
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
  { id: "cp", name: "Copper",   color: "#B87333" },
  { id: "sp", name: "Silver",   color: "#C0C0C0" },
  { id: "ep", name: "Electrum", color: "#A8C5A6" },
  { id: "gp", name: "Gold",     color: "#F2B33D" },
  { id: "pp", name: "Platinum", color: "#E5E4E2" },
];

export default function EquipmentStep({ characterData, updateCharacterData }) {
  const classKey = characterData.class;
  const entry = classKey ? STARTING_EQUIPMENT[classKey] : null;
  const fixedItems = entry?.fixed || [];
  const choices = useMemo(
    () => (entry?.choices || []).map(optionsForChoice),
    [entry],
  );

  // Per-choice selection — index → chosen option string.
  const [selectedChoices, setSelectedChoices] = useState(() => {
    const stored = characterData.equipment_choices || {};
    return choices.map((opts, i) => stored[i] ?? opts?.[0] ?? "");
  });

  const inventory = Array.isArray(characterData.inventory) ? characterData.inventory : [];
  const currency = characterData.currency || {};
  const usedStartingGold = !!characterData.used_starting_gold;

  // Bazaar state
  const gamePack = useMemo(
    () => getGamePack(characterData.gamePack || "dnd5e_2014"),
    [characterData.gamePack],
  );
  const allItems = useMemo(() => gamePack.getEquipment(), [gamePack]);
  const [showBazaar, setShowBazaar] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState("all");

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

  const pickChoice = (idx, option) => {
    const next = selectedChoices.slice();
    next[idx] = option;
    setSelectedChoices(next);
    updateCharacterData({
      equipment_choices: { ...(characterData.equipment_choices || {}), [idx]: option },
    });
  };

  const applyStartingEquipment = () => {
    const kitItems = buildStartingKit(fixedItems, selectedChoices, (n) => gamePack.getEquipmentByName(n));
    // Idempotent: drop any previously-applied kit items before re-adding,
    // so clicking "add starting equipment" twice can't duplicate the kit.
    const nonKit = inventory.filter((it) => it?.source !== "starting-kit");
    updateCharacterData({
      inventory: [...nonKit, ...kitItems],
      // Kit and rolled gold are mutually exclusive (SRD): taking the kit
      // turns the gold option off.
      used_starting_gold: false,
    });
    toast.success("Starting equipment added to inventory.");
  };

  const toggleUseStartingGold = () => {
    const next = !usedStartingGold;
    if (next) {
      // Choosing rolled gold clears the starting kit — alternatives, not both.
      updateCharacterData({
        used_starting_gold: true,
        inventory: inventory.filter((it) => it?.source !== "starting-kit"),
      });
    } else {
      updateCharacterData({ used_starting_gold: false });
    }
  };

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
    const weight = Number(item?.weight ?? item?.properties?.weight ?? item?.properties?._raw?.weight ?? 0) || 0;
    const description = typeof item?.description === "string" ? item.description.slice(0, 240) : "";
    // Carry a structured type so AC (and future consumers) can identify
    // armor/shield without string-guessing.
    const type = classifyType(item);
    const next = { name: item.name, quantity: 1, weight, description, type };
    if (type === "armor" || type === "shield") next.armorCategory = item.armorCategory;
    updateCharacterData({ inventory: [...inventory, next] });
    toast.success(`Added ${item.name}`);
  };

  const setCoin = (coin, value) => {
    updateCharacterData({
      currency: {
        ...currency,
        [coin]: Math.max(0, parseInt(value, 10) || 0),
      },
    });
  };

  return (
    <div>
      <StepHeader
        kicker="Step 7 of 8"
        title="Pack your gear"
        subtitle="Your class starts you with a kit. You can also roll for gold instead and shop later."
      />

      <Primer title="How starting equipment works">
        Every class hands you a <strong>starter pack</strong> for free — armor, a weapon, tools,
        supplies. Some slots have a choice (longsword <em>or</em> rapier?). When in doubt, take the
        one that matches your highest stat. Want to shop instead? Toggle{' '}
        <strong>"Use starting gold"</strong> and roll for coin.
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {classKey && entry && !usedStartingGold && (
            <StartingKitPanel
              classKey={classKey}
              fixedItems={fixedItems}
              choices={choices}
              selectedChoices={selectedChoices}
              onPick={pickChoice}
              onApply={applyStartingEquipment}
              onUseGold={toggleUseStartingGold}
              startingGold={entry.startingGold}
            />
          )}

          {classKey && entry && usedStartingGold && (
            <RolledGoldPanel
              classKey={classKey}
              startingGold={entry.startingGold}
              currency={currency}
              onUpdate={(value) => setCoin("gp", value)}
              onBack={toggleUseStartingGold}
            />
          )}

          <ItemBrowserPanel
            open={showBazaar}
            onToggle={() => setShowBazaar((v) => !v)}
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

          <CurrencyPanel currency={currency} onChange={setCoin} />
        </div>

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
            currency={currency}
            totalWeight={totalWeight}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Starting kit panel — fixed-item chip row + choice button rows + Apply
// + Use starting gold toggle. Mirrors prototype's StartingKitPanel exactly.
// ============================================================================
function StartingKitPanel({
  classKey, fixedItems, choices, selectedChoices, onPick, onApply, onUseGold, startingGold,
}) {
  const goldStr = startingGold
    ? `${startingGold.dice || ''}${startingGold.multiplier ? ` × ${startingGold.multiplier} gp` : ' gp'}`
    : '';
  return (
    <div className="panel" style={{ padding: 20 }}>
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
        <h3 className="display" style={{ fontSize: 22, color: 'var(--text)', margin: 0 }}>
          {classKey} starter kit
        </h3>
        {goldStr && (
          <button
            type="button"
            onClick={onUseGold}
            className="btn btn-ghost"
            style={{ fontSize: 12, padding: '6px 12px' }}
          >
            💰 Use starting gold instead ({goldStr})
          </button>
        )}
      </div>

      {fixedItems.length > 0 && (
        <>
          <div className="label" style={{ marginBottom: 8 }}>Included automatically</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
            {fixedItems.map((item, idx) => (
              <span
                key={`${item}-${idx}`}
                className="chip"
                style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
              >
                <Check className="w-3 h-3" /> {item}
              </span>
            ))}
          </div>
        </>
      )}

      {choices.length > 0 && (
        <>
          <div className="label" style={{ marginBottom: 8 }}>Pick one from each row</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {choices.map((opts, idx) => (
              <ChoiceRow
                key={idx}
                label={`Choice ${idx + 1}`}
                options={opts}
                value={selectedChoices[idx]}
                onPick={(option) => onPick(idx, option)}
              />
            ))}
          </div>
        </>
      )}

      <div
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={onApply}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Sparkles className="w-4 h-4" />
          Add starting equipment to inventory
        </button>
      </div>
    </div>
  );
}

function ChoiceRow({ label, options, value, onPick }) {
  return (
    <div
      style={{
        background: 'rgba(20, 12, 8, 0.5)',
        padding: 12,
        borderRadius: 10,
        border: '1px solid var(--border)',
      }}
    >
      <div className="label" style={{ marginBottom: 8 }}>{label}</div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(options.length, 4)}, 1fr)`,
          gap: 6,
        }}
      >
        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onPick(option)}
              className={`pickable ${active ? 'selected-teal' : ''}`}
              style={{
                padding: '8px 10px',
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 600,
                color: 'inherit',
              }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Rolled gold panel — shown when "Use starting gold instead" is active.
// Roll the class's gold formula or enter a custom amount. The gp value
// writes into characterData.currency.gp.
// ============================================================================
function RolledGoldPanel({ classKey, startingGold, currency, onUpdate, onBack }) {
  const dice = startingGold?.dice || '';
  const multiplier = startingGold?.multiplier || 1;
  const formula = `${dice}${multiplier > 1 ? ` × ${multiplier} gp` : ' gp'}`;

  const roll = () => {
    const match = String(dice || '').match(/(\d+)d(\d+)/);
    if (!match) {
      onUpdate(0);
      return;
    }
    const count = +match[1];
    const die = +match[2];
    let total = 0;
    for (let i = 0; i < count; i++) total += Math.floor(Math.random() * die) + 1;
    onUpdate(total * (multiplier || 1));
  };

  return (
    <div className="panel" style={{ padding: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <h3 className="display" style={{ fontSize: 22, color: 'var(--text)', margin: 0 }}>
          {classKey} rolled starting gold
        </h3>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-ghost"
          style={{ fontSize: 12, padding: '6px 12px' }}
        >
          ← Back to starter kit
        </button>
      </div>
      <p
        className="italic-serif"
        style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.5 }}
      >
        You'll be given <strong style={{ color: 'var(--gold)' }}>{formula}</strong> to spend on
        gear of your choice. Roll it now or set a custom amount.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={roll}
          className="btn btn-primary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Dices className="w-4 h-4" /> Roll {formula}
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="label">Gold</div>
          <input
            type="number"
            className="input"
            value={currency.gp || 0}
            onChange={(e) => onUpdate(Number(e.target.value) || 0)}
            style={{ width: 120, textAlign: 'right' }}
          />
          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>gp</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Item browser — collapsible bazaar. Search + type filter + scrollable
// rows; click adds to inventory.
// ============================================================================
function ItemBrowserPanel({
  open, onToggle, search, onSearchChange, typeFilter, onTypeChange,
  filteredItems, onAdd,
}) {
  return (
    <div className="panel" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: open ? 14 : 0,
          gap: 10,
        }}
      >
        <h3 className="display" style={{ fontSize: 20, color: 'var(--text)', margin: 0 }}>
          The bazaar
        </h3>
        <button
          type="button"
          onClick={onToggle}
          className="btn btn-ghost"
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
                  color: 'var(--text-faint)',
                }}
              />
              <input
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search items…"
                className="input"
                style={{ paddingLeft: 32 }}
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => onTypeChange(e.target.value)}
              className="input"
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
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          >
            {filteredItems.length === 0 ? (
              <p
                className="italic-serif"
                style={{
                  fontSize: 13,
                  color: 'var(--text-faint)',
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
                    borderBottom: '1px solid var(--border-faint)',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(212, 169, 81, 0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
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
                        color: 'var(--text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {safeText(item.name)}
                    </span>
                    {item.type && (
                      <span
                        className="label"
                        style={{ fontSize: 9, color: 'var(--text-faint)' }}
                      >
                        {safeText(item.type)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {item.cost && (
                      <span style={{ fontSize: 11, color: 'var(--gold-soft)' }}>
                        {typeof item.cost === 'string' ? item.cost : safeText(item.cost)}
                      </span>
                    )}
                    <Plus className="w-4 h-4" style={{ color: 'var(--teal)' }} />
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
// InventoryPanel — editable list with locked-item protection. Locked items
// (class-bound — sourced from cipherInventoryItems config) get a gold border
// and a disabled remove button.
// ============================================================================
function InventoryPanel({ inventory, totalWeight, onAdd, onRemove, onUpdate }) {
  return (
    <div className="panel" style={{ padding: 18 }}>
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
        <h3 className="display" style={{ fontSize: 20, color: 'var(--text)', margin: 0 }}>
          Personal items
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span className="italic-serif" style={{ fontSize: 12, color: 'var(--text-faint)' }}>
            {inventory.length} item{inventory.length !== 1 ? 's' : ''} ·{' '}
            {totalWeight.toFixed(1)} lb
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="btn btn-teal"
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
          className="italic-serif"
          style={{
            fontSize: 13,
            color: 'var(--text-faint)',
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
                  border: `1px solid ${locked ? 'var(--gold)' : 'var(--border)'}`,
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
                    className="input"
                    disabled={locked}
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onUpdate(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                    placeholder="Qty"
                    className="input"
                    style={{ textAlign: 'center' }}
                  />
                  <input
                    type="number"
                    value={item.weight}
                    onChange={(e) => onUpdate(index, 'weight', parseFloat(e.target.value) || 0)}
                    placeholder="lb"
                    className="input"
                    style={{ textAlign: 'center' }}
                  />
                  <input
                    value={item.description || ''}
                    onChange={(e) => onUpdate(index, 'description', e.target.value)}
                    placeholder="Notes"
                    className="input"
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
                      color: locked ? 'var(--text-faint)' : 'var(--orange)',
                      border: `1px solid ${locked ? 'var(--border-faint)' : 'var(--orange)'}`,
                      opacity: locked ? 0.4 : 1,
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {locked && (
                  <div
                    className="italic-serif"
                    style={{ fontSize: 11, color: 'var(--gold-soft)', marginTop: 6 }}
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
// CurrencyPanel — 5-coin purse with color-tipped borders. Prototype-exact.
// ============================================================================
function CurrencyPanel({ currency, onChange }) {
  return (
    <div className="panel" style={{ padding: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h3 className="display" style={{ fontSize: 22, color: 'var(--text)', margin: 0 }}>
          Coin purse
        </h3>
        <HelpTip>
          1 platinum = 10 gold = 100 silver = 1000 copper. Electrum is 5 silver. Most adventurers
          use gold.
        </HelpTip>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {COINS.map((c) => (
          <div
            key={c.id}
            style={{
              background: 'rgba(20, 12, 8, 0.55)',
              padding: 10,
              borderRadius: 8,
              borderTop: `3px solid ${c.color}`,
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="label"
              style={{
                color: c.color,
                marginBottom: 4,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {c.id}
            </div>
            <input
              type="number"
              min={0}
              value={currency[c.id] || 0}
              onChange={(e) => onChange(c.id, e.target.value)}
              className="input"
              style={{
                padding: '6px 10px',
                fontSize: 14,
                fontWeight: 700,
                textAlign: 'center',
              }}
            />
            <div
              style={{
                fontSize: 10,
                color: 'var(--text-faint)',
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
// PackingListPanel — right-rail preview of what's in the pack + totals
// ============================================================================
function PackingListPanel({ inventory, currency, totalWeight }) {
  const totalGoldEquiv =
    (Number(currency.cp) || 0) / 100
    + (Number(currency.sp) || 0) / 10
    + (Number(currency.ep) || 0) / 2
    + (Number(currency.gp) || 0)
    + (Number(currency.pp) || 0) * 10;

  return (
    <div className="panel" style={{ padding: 16 }}>
      <div className="label" style={{ marginBottom: 12 }}>Packing list</div>

      {inventory.length === 0 ? (
        <div
          className="italic-serif"
          style={{ fontSize: 12, color: 'var(--text-faint)' }}
        >
          Pick gear above to fill your pack.
        </div>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: '0 0 0 18px',
            fontSize: 12,
            color: 'var(--text-dim)',
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
                  <span style={{ color: 'var(--text-faint)' }}> ×{it.quantity}</span>
                )}
              </li>
            ))}
        </ul>
      )}

      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid var(--border-faint)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          fontSize: 11,
          color: 'var(--text-dim)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Total weight</span>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>
            {totalWeight.toFixed(1)} lb
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Treasury</span>
          <span style={{ color: 'var(--gold)', fontWeight: 600 }}>
            {totalGoldEquiv.toFixed(1)} gp
          </span>
        </div>
      </div>
    </div>
  );
}
