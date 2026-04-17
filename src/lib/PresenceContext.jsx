import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

/**
 * Presence / status tracking for the signed-in user.
 *
 * On mount:
 *   - Sets the user's user_profiles.status to 'online' and stamps
 *     last_seen_at.
 *   - Starts a 2-minute heartbeat that refreshes last_seen_at so
 *     other clients can decide whether the stored status is stale.
 *   - Subscribes to mousemove / keypress / click / scroll so 5
 *     minutes of inactivity flips the user from online → away; a
 *     single activity event while away flips them back to online.
 *
 * On unmount / tab close:
 *   - Attempts a best-effort offline write (via navigator.sendBeacon
 *     when available; falls back to a normal supabase call).
 *
 * The `useMyPresence()` hook exposes { status, setStatus } so the
 * nav StatusDot can let the user manually change their status.
 */

export const STATUS_OPTIONS = [
  { value: 'online',  label: 'Online',         dot: 'bg-green-500',  labelColor: 'text-green-300' },
  { value: 'away',    label: 'Away',           dot: 'bg-yellow-500', labelColor: 'text-yellow-300' },
  { value: 'dnd',     label: 'Do Not Disturb', dot: 'bg-red-500',    labelColor: 'text-red-300' },
  { value: 'offline', label: 'Offline',        dot: 'bg-gray-500',   labelColor: 'text-gray-300' },
];

const STATUS_BY_VALUE = Object.fromEntries(STATUS_OPTIONS.map((s) => [s.value, s]));

/**
 * Translate a profile row into the "actual" status the UI should
 * render. A user whose last_seen_at is older than 10 minutes is
 * treated as offline regardless of what they stored.
 */
export function resolveStatus(profile) {
  if (!profile) return 'offline';
  const stored = profile.status || 'offline';
  if (stored === 'offline') return 'offline';
  const lastSeen = profile.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0;
  if (!lastSeen) return stored;
  if (Date.now() - lastSeen > 10 * 60 * 1000) return 'offline';
  return stored;
}

export function statusMeta(value) {
  return STATUS_BY_VALUE[value] || STATUS_BY_VALUE.offline;
}

const PresenceContext = createContext({
  status: 'offline',
  setStatus: () => {},
});

const IDLE_MS = 5 * 60 * 1000;      // 5 min → away
const HEARTBEAT_MS = 2 * 60 * 1000; // 2 min → last_seen_at refresh

export function PresenceProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const profileId = user?.profile_id || null;
  const userId = user?.id || null;

  const [status, setStatusState] = useState('online');
  const statusRef = useRef(status);
  const idleTimer = useRef(null);
  const heartbeatTimer = useRef(null);
  const isAwayAuto = useRef(false); // distinguishes manual DND vs auto-away

  // Keep the ref in sync so the idle timeout can read the latest
  // without re-binding listeners.
  useEffect(() => { statusRef.current = status; }, [status]);

  // Shared write path. Stamps last_seen_at alongside the status so
  // downstream reads can resolve staleness.
  const writeStatus = useCallback(async (next, extra = {}) => {
    if (!profileId) return;
    try {
      await base44.entities.UserProfile.update(profileId, {
        status: next,
        last_seen_at: new Date().toISOString(),
        ...extra,
      });
    } catch {
      // Silently swallow — presence is best-effort. Console noise
      // during offline flushes confuses other logs.
    }
    queryClient.invalidateQueries({ queryKey: ['currentUser'] });
  }, [profileId, queryClient]);

  const setStatus = useCallback((next) => {
    if (!STATUS_BY_VALUE[next]) return;
    isAwayAuto.current = false;
    setStatusState(next);
    writeStatus(next);
  }, [writeStatus]);

  // Initial load — mark online + start timers.
  useEffect(() => {
    if (!profileId) return;
    setStatusState('online');
    writeStatus('online');
    heartbeatTimer.current = setInterval(() => {
      // Only heartbeat when the tab is visible to avoid keeping
      // "online" alive for a backgrounded tab.
      if (document.visibilityState === 'visible' && statusRef.current !== 'offline') {
        writeStatus(statusRef.current);
      }
    }, HEARTBEAT_MS);
    return () => {
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    };
  }, [profileId, writeStatus]);

  // Idle detection — mouse / keyboard / touch / scroll.
  useEffect(() => {
    if (!profileId) return;

    const scheduleIdle = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        // Only flip to away from online. Don't override DND.
        if (statusRef.current === 'online') {
          isAwayAuto.current = true;
          setStatusState('away');
          writeStatus('away');
        }
      }, IDLE_MS);
    };

    const onActivity = () => {
      // If the user is auto-away, an activity event should bring
      // them back to online. Manually-set statuses (DND / offline)
      // stay put.
      if (statusRef.current === 'away' && isAwayAuto.current) {
        isAwayAuto.current = false;
        setStatusState('online');
        writeStatus('online');
      }
      scheduleIdle();
    };

    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    for (const evt of events) window.addEventListener(evt, onActivity, { passive: true });
    scheduleIdle();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      for (const evt of events) window.removeEventListener(evt, onActivity);
    };
  }, [profileId, writeStatus]);

  // beforeunload / visibility change — try to leave an "offline"
  // marker so stale readers don't show the user as online.
  useEffect(() => {
    if (!profileId) return;
    const goOffline = () => {
      // sendBeacon would be ideal but we'd need a server endpoint
      // — instead, fire the supabase call sync-ish; worst case the
      // last_seen_at staleness check still kicks them offline in
      // 10 minutes.
      writeStatus('offline');
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Stamp last_seen_at but keep the stored status; if they
        // come back inside 10 minutes the next read still shows
        // "online" / "away".
        writeStatus(statusRef.current);
      }
    };
    window.addEventListener('beforeunload', goOffline);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', goOffline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [profileId, writeStatus]);

  return (
    <PresenceContext.Provider value={{ status, setStatus, userId }}>
      {children}
    </PresenceContext.Provider>
  );
}

export const useMyPresence = () => useContext(PresenceContext);
