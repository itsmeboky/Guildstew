/**
 * Spice currency config — single source of truth for bundle prices,
 * stipends, fees, splits, and discounts used across the Tavern.
 *
 * Base rate: $1.00 USD = 250 Spice. Bonus Spice on larger bundles is
 * pre-baked into the `spice` amount (the bonus field is just a label
 * for the UI). Never expires. Unspent Spice can be refunded via
 * Stripe but spent Spice cannot.
 */

export const SPICE_RATE = 250;

export const SPICE_BUNDLES = [
  { id: "bundle_250",   label: "625 Spice",     spice: 625,    price: 2.50,  bonus: 0,    badge: null },
  { id: "bundle_500",   label: "1,310 Spice",   spice: 1310,   price: 5.00,  bonus: 60,   badge: null },
  { id: "bundle_1000",  label: "2,750 Spice",   spice: 2750,   price: 10.00, bonus: 250,  badge: "10% Bonus" },
  { id: "bundle_2500",  label: "7,200 Spice",   spice: 7200,   price: 25.00, bonus: 950,  badge: "15% Bonus" },
  { id: "bundle_5000",  label: "14,375 Spice",  spice: 14375,  price: 50.00, bonus: 1875, badge: "15% Bonus — Best Value" },
];

// Free users get no stipend. Guild stipend lands in the shared guild
// wallet so the whole table benefits from one member's sub.
export const MONTHLY_STIPENDS = {
  free: 0,
  adventurer: 175,
  veteran: 400,
  guild: 250,
};

// One-time fee charged to the creator when they publish a Tavern item.
// Higher tiers upload free; free tier pays $5 worth of Spice.
export const UPLOAD_FEES = {
  free: 1250,
  adventurer: 250,
  veteran: 0,
  guild: 0,
};

// Buyer discount at checkout on top of the creator's listed price.
export const BUYER_DISCOUNTS = {
  free: 0,
  adventurer: 0.10,
  veteran: 0.20,
  guild: 0.20,
};

// [platform, creator] — paid tiers keep more of the sale price.
export const CREATOR_SPLITS = {
  free: [50, 50],
  adventurer: [30, 70],
  veteran: [20, 80],
  guild: [20, 80],
};

export const MIN_ITEM_PRICE = 625;
export const MIN_CASHOUT = 12500;

export function applyDiscount(price, tier) {
  const discount = BUYER_DISCOUNTS[tier] || 0;
  return Math.round(price * (1 - discount));
}

export function calculateCreatorEarning(price, creatorTier) {
  const split = CREATOR_SPLITS[creatorTier] || CREATOR_SPLITS.free;
  return Math.round(price * (split[1] / 100));
}

export function formatSpice(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString();
}
