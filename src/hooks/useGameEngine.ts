'use client';

/**
 * Idol Idle — React Hook Bridging Engine ↔ UI
 *
 * Authoritative game state lives in a ref (stateRef) to avoid 10Hz React
 * re-renders. The simulation ticks at 10Hz (every 100ms) via setInterval,
 * mutating only the ref. A shallow snapshot is pushed to useState every
 * SNAPSHOT_EVERY_N_TICKS (default 2 → 5Hz) so the UI updates smoothly without
 * thrashing reconciliation.
 *
 * User actions (click, buy, hire, ...) commit synchronously: they update the
 * ref AND the snapshot immediately so clicks feel responsive.
 *
 * Autosave:
 *   - User actions schedule a 500ms-debounced save.
 *   - The 10Hz tick force-saves every AUTOSAVE_EVERY_N_TICKS (50 → every 5s).
 *   - beforeunload / visibilitychange fire an immediate save.
 *
 * The hook returns {state, actions, offlineSummary, dismissOfflineSummary,
 * prestigeInfo}. `state` is non-null on every render after the first effect
 * runs (it begins as a deterministic placeholder with last_saved_at = 0 so
 * server and client first-render match, avoiding hydration mismatches).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as engine from '@/lib/game/engine';
import {
  loadGame,
  saveGame as persistGame,
  clearSave as wipeSave,
} from '@/lib/game/save';
import type {
  ClickResult,
  GameState,
  OfflineSummary,
  PrestigeInfo,
  Resources,
} from '@/lib/game/types';

const TICK_INTERVAL_MS = 100;
const SNAPSHOT_EVERY_N_TICKS = 2; // 10Hz sim → 5Hz UI
const AUTOSAVE_EVERY_N_TICKS = 50; // 10Hz sim → save every 5s
const AUTOSAVE_DEBOUNCE_MS = 500;
const OFFLINE_SUMMARY_MIN_MS = 60_000; // don't pop modal for sub-minute gaps

/** Actions exposed by the hook. */
export interface GameActions {
  /** Perform a click. Returns the per-resource gains for floating-text UI. */
  click: () => ClickResult | null;
  /** Buy `qty` levels of an upgrade. Throws from the engine (caller should pre-validate via upgradeCost). */
  buyUpgrade: (id: string, qty?: number) => void;
  /** Hire `qty` staff. */
  hireStaff: (id: string, qty?: number) => void;
  /** Release a song (costs cash + reputation). */
  releaseSong: (id: string) => void;
  /** Unlock a venue (must meet fan/rep gates). */
  unlockVenue: (id: string) => void;
  /** Switch the current venue (must be unlocked). */
  setVenue: (id: string) => void;
  /** Wipe the save and start a fresh game. */
  clearSave: () => void;
  /** Debug: simulate N minutes of offline production at full efficiency. */
  simulateOffline: (minutes: number) => void;
  /** Debug: grant arbitrary resources. */
  grantResources: (
    amount: Partial<Record<keyof Resources, number>>,
  ) => void;
}

export interface UseGameEngine {
  /** The latest snapshot. Never null after first render (placeholder until first effect). */
  state: GameState;
  actions: GameActions;
  offlineSummary: OfflineSummary | null;
  dismissOfflineSummary: () => void;
  prestigeInfo: PrestigeInfo;
}

/**
 * Deterministic placeholder shown for the very first render (server +
 * client pre-hydration). Using last_saved_at = 0 and identical fans=0
 * everywhere avoids hydration mismatches; the real state is loaded in
 * the mount effect and replaces this.
 */
function placeholderState(): GameState {
  return engine.initialState(0);
}

export function useGameEngine(): UseGameEngine {
  // Authoritative engine state. Mutated by the tick interval and actions.
  const stateRef = useRef<GameState>(placeholderState());
  // React-facing snapshot. Updated at 5Hz from the tick and synchronously
  // from user actions.
  const [snapshot, setSnapshot] = useState<GameState>(() => placeholderState());
  const [offlineSummary, setOfflineSummary] =
    useState<OfflineSummary | null>(null);

  // Wall-clock anchor for computing dt on each tick.
  const lastTickRef = useRef<number>(0);
  // Tick counter, used to gate snapshot + autosave frequency.
  const tickCountRef = useRef<number>(0);
  // Debounced autosave timer handle.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------------------------------------------------------------------------
  // Autosave helpers
  // ---------------------------------------------------------------------------

  const scheduleAutosave = useCallback((state: GameState) => {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      persistGame(state);
    }, AUTOSAVE_DEBOUNCE_MS);
  }, []);

  const flushAutosave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    persistGame(stateRef.current);
  }, []);

  // ---------------------------------------------------------------------------
  // Commit helper: writes to ref + snapshot + schedules autosave.
  // ---------------------------------------------------------------------------

  const commit = useCallback(
    (next: GameState, opts?: { silent?: boolean }) => {
      stateRef.current = next;
      setSnapshot(next);
      if (!opts?.silent) scheduleAutosave(next);
    },
    [scheduleAutosave],
  );

  // ---------------------------------------------------------------------------
  // Mount effect: load save, apply offline, start tick + autosave listeners.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // --- Init ---
    const { state: loaded } = loadGame();
    let current: GameState;
    if (loaded) {
      const { state: afterOffline, summary } = engine.applyOffline(
        loaded,
        Date.now(),
      );
      current = afterOffline;
      // Only surface a modal if the gap was meaningful and produced something.
      // The setState here is the canonical "load external state into React"
      // pattern (localStorage → React state); the lint rule flags all
      // synchronous setStates in effects, but this is a one-time init.
      if (
        summary.elapsed_ms >= OFFLINE_SUMMARY_MIN_MS &&
        (summary.fans_gained > 0 ||
          summary.cash_gained > 0 ||
          summary.rep_gained > 0)
      ) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOfflineSummary(summary);
      }
    } else {
      current = engine.initialState();
    }
    stateRef.current = current;
    lastTickRef.current = Date.now();
    setSnapshot(current);
    // Persist immediately so the save exists even if the user closes the tab
    // before the first autosave tick.
    persistGame(current);

    // --- Tick (10Hz) ---
    const intervalId = window.setInterval(() => {
      const prev = stateRef.current;
      const now = Date.now();
      // Clamp dt to a sane range so a stale tab doesn't try to simulate a
      // 10-year tick (backgrounded tabs can fire very late). Anything larger
      // than a couple of seconds is treated as an offline gap and handled
      // here too — the engine handles any dt analytically.
      const rawDt = now - lastTickRef.current;
      lastTickRef.current = now;
      const dt = Math.max(0, rawDt) * prev.settings.sim_speed;
      if (dt <= 0) return;
      const next = engine.tick(prev, dt);
      stateRef.current = next;

      tickCountRef.current += 1;
      const n = tickCountRef.current;
      if (n % SNAPSHOT_EVERY_N_TICKS === 0) {
        setSnapshot(next);
      }
      if (n % AUTOSAVE_EVERY_N_TICKS === 0) {
        // Direct (non-debounced) save so active play still persists even if
        // no user actions fire.
        persistGame(next);
      }
    }, TICK_INTERVAL_MS);

    // --- Lifecycle save handlers ---
    const handleBeforeUnload = () => {
      flushAutosave();
    };
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        flushAutosave();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Final flush on unmount (HMR, route change, etc.).
      flushAutosave();
    };
    // We intentionally run this exactly once on mount. scheduleAutosave and
    // flushAutosave are stable (empty-dep useCallbacks); including them is
    // safe and satisfies exhaustive-deps without changing behavior.
  }, [scheduleAutosave, flushAutosave]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const click = useCallback((): ClickResult | null => {
    const prev = stateRef.current;
    const { state: next, result } = engine.clickPerform(prev);
    commit(next);
    return result;
  }, [commit]);

  const buyUpgrade = useCallback(
    (id: string, qty: number = 1) => {
      try {
        const next = engine.buyUpgrade(stateRef.current, id, qty);
        commit(next);
      } catch (err) {
        // Surface via console so UI developers can debug; UI buttons should
        // pre-validate via engine.upgradeCost / engine.maxAffordable.
        console.warn('[idol-idle] buyUpgrade failed:', err);
      }
    },
    [commit],
  );

  const hireStaff = useCallback(
    (id: string, qty: number = 1) => {
      try {
        const next = engine.hireStaff(stateRef.current, id, qty);
        commit(next);
      } catch (err) {
        console.warn('[idol-idle] hireStaff failed:', err);
      }
    },
    [commit],
  );

  const releaseSong = useCallback(
    (id: string) => {
      try {
        const next = engine.releaseSong(stateRef.current, id);
        commit(next);
      } catch (err) {
        console.warn('[idol-idle] releaseSong failed:', err);
      }
    },
    [commit],
  );

  const unlockVenue = useCallback(
    (id: string) => {
      try {
        const next = engine.unlockVenue(stateRef.current, id);
        commit(next);
      } catch (err) {
        console.warn('[idol-idle] unlockVenue failed:', err);
      }
    },
    [commit],
  );

  const setVenue = useCallback(
    (id: string) => {
      try {
        const next = engine.setVenue(stateRef.current, id);
        // setVenue may return the same state ref (no-op case) — committing is
        // still safe (it just re-sets the snapshot to the same value).
        commit(next);
      } catch (err) {
        console.warn('[idol-idle] setVenue failed:', err);
      }
    },
    [commit],
  );

  const clearSave = useCallback(() => {
    wipeSave();
    const fresh = engine.initialState();
    stateRef.current = fresh;
    lastTickRef.current = Date.now();
    setSnapshot(fresh);
    setOfflineSummary(null);
    persistGame(fresh);
  }, []);

  const simulateOffline = useCallback(
    (minutes: number) => {
      const { state: next, summary } = engine.simulateOffline(
        stateRef.current,
        minutes,
      );
      commit(next);
      setOfflineSummary(summary);
    },
    [commit],
  );

  const grantResources = useCallback(
    (amount: Partial<Record<keyof Resources, number>>) => {
      const next = engine.grantResources(stateRef.current, amount);
      commit(next);
    },
    [commit],
  );

  const actions: GameActions = useMemo(
    () => ({
      click,
      buyUpgrade,
      hireStaff,
      releaseSong,
      unlockVenue,
      setVenue,
      clearSave,
      simulateOffline,
      grantResources,
    }),
    [
      click,
      buyUpgrade,
      hireStaff,
      releaseSong,
      unlockVenue,
      setVenue,
      clearSave,
      simulateOffline,
      grantResources,
    ],
  );

  // ---------------------------------------------------------------------------
  // prestigeInfo is derived from snapshot (5Hz recompute is fine).
  // ---------------------------------------------------------------------------

  const prestigeInfo: PrestigeInfo = useMemo(
    () => engine.getPrestigeInfo(snapshot),
    [snapshot],
  );

  const dismissOfflineSummary = useCallback(() => {
    setOfflineSummary(null);
  }, []);

  return {
    state: snapshot,
    actions,
    offlineSummary,
    dismissOfflineSummary,
    prestigeInfo,
  };
}
