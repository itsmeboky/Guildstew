/**
 * Spice-balance pubsub.
 *
 * After a successful purchase the Buy Spice popup needs the actual
 * balance display widgets — sidebar header chip, Tavern hero pill —
 * to animate from the pre-purchase value to the new value. Wiring
 * that through React Query alone would just snap to the final number
 * on the next refetch, so we publish a one-shot { from, to } event
 * that any mounted balance component can subscribe to and replay as
 * a smooth count-up.
 *
 * Usage:
 *   import { notifySpicePurchase, subscribeSpicePurchase } from
 *     '@/lib/spiceBalanceBus';
 *
 *   notifySpicePurchase({ from: 500, to: 1810 });
 *
 *   const off = subscribeSpicePurchase(({ from, to }) => { ... });
 *   off();
 */

const listeners = new Set();

export function subscribeSpicePurchase(handler) {
  if (typeof handler !== "function") return () => {};
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function notifySpicePurchase({ from, to }) {
  const payload = { from: Number(from) || 0, to: Number(to) || 0 };
  for (const fn of Array.from(listeners)) {
    try { fn(payload); } catch (err) { console.error("spice bus listener", err); }
  }
}
