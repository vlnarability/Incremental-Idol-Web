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
import { getAudioEngine } from '@/lib/game/audio';
import {
  loadGame,
  saveGame as persistGame,
  clearSave as wipeSave,
} from '@/lib/game/save';
import type {
  ActiveEvent,
  AchievementDefinition,
  ClickResult,
  ComboState,
  EventLogEntry,
  GameToast,
  GameState,
  Milestone,
  OfflineSummary,
  PrestigeInfo,
  Resources,
  TrendSnapshot,
} from '@/lib/game/types';

const TICK_INTERVAL_MS = 100;
const SNAPSHOT_EVERY_N_TICKS = 2; // 10Hz sim → 5Hz UI
const AUTOSAVE_EVERY_N_TICKS = 50; // 10Hz sim → save every 5s
const AUTOSAVE_DEBOUNCE_MS = 500;
const OFFLINE_SUMMARY_MIN_MS = 60_000; // don't pop modal for sub-minute gaps
const TOAST_AUTO_DISMISS_MS = 4500; // toasts auto-dismiss after 4.5s
const TOAST_MAX_VISIBLE = 4; // cap concurrent toasts to avoid flooding

// ---- Combo tuning (UI-side; engine only sees the resulting multiplier) ----
const COMBO_WINDOW_MS = 1_500; // clicks within this gap extend the combo
const COMBO_MAX_COUNT = 50; // caps the multiplier at 1 + 50*0.02 = 2.0×
const COMBO_PER_STEP = 0.02; // +2% click value per combo step

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
  /** Resolve the active event by picking a choice. No-op if no active event. */
  resolveEvent: (choiceId: string) => void;
  /** Update player settings (sim_speed, offline_cap_hours, sound_enabled). */
  updateSettings: (patch: Partial<GameState['settings']>) => void;
  /** Wipe the save and start a fresh game. */
  clearSave: () => void;
  /** Debug: simulate N minutes of offline production at full efficiency. */
  simulateOffline: (minutes: number) => void;
  /** Debug: force an event to spawn on the next tick (sets last_event_spawned_at=0). */
  debugForceEvent: () => void;
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
  /** Current click-combo state (count + multiplier). Updates on every click + every UI tick. */
  combo: ComboState;
  /** Snapshot of the active trend at the current sim time. */
  trend: TrendSnapshot;
  /** Active event awaiting player decision, or null. */
  activeEvent: ActiveEvent | null;
  /** Recent event outcomes (newest first), capped at 20. */
  eventLog: EventLogEntry[];
  /** All achievement definitions (static). */
  achievements: AchievementDefinition[];
  /** IDs of achievements the player has unlocked. */
  unlockedAchievements: string[];
  /** Career milestones in chronological order (oldest first). */
  milestones: Milestone[];
  /** Active toast queue (newest first). Auto-dismisses after 4.5s. */
  toasts: GameToast[];
  /** Dismiss a toast by id (also auto-called after the auto-dismiss timer). */
  dismissToast: (id: number) => void;
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

  // ---- Combo state (UI-side; never persisted to the engine save) ----
  // Combo count lives in a ref so the click action can read+mutate it
  // synchronously without forcing a re-render mid-action. A snapshot of
  // combo is mirrored into React state at 5Hz (same cadence as the engine
  // snapshot) so the UI can render the live counter + decay ring.
  const comboCountRef = useRef<number>(0);
  const comboLastClickAtRef = useRef<number>(0);
  const [comboSnapshot, setComboSnapshot] = useState<ComboState>(() => ({
    count: 0,
    multiplier: 1,
    last_click_at: 0,
  }));

  // ---- Toast state ----
  // Toasts are pure UI notifications (achievement unlocks, event spawns,
  // milestones). They live in React state because they need to trigger
  // re-renders. A ref tracks the next toast id for stable unique keys.
  const toastIdRef = useRef<number>(1);
  const [toasts, setToasts] = useState<GameToast[]>([]);

  // Track previous activeEvent to detect spawn transitions (null → event).
  const prevActiveEventRef = useRef<ActiveEvent | null>(null);

  // ---- Audio engine ----
  // Sync the audio engine's enabled state with settings.sound_enabled.
  // The engine is a singleton; we just toggle its enabled flag.
  const audioEngine = useMemo(() => getAudioEngine(), []);
  useEffect(() => {
    audioEngine.setEnabled(snapshot.settings.sound_enabled);
  }, [snapshot.settings.sound_enabled, audioEngine]);

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
  // Toast helpers
  // ---------------------------------------------------------------------------

  const queueToast = useCallback((toast: Omit<GameToast, 'id' | 'queued_at'>) => {
    const id = toastIdRef.current++;
    const fullToast: GameToast = { ...toast, id, queued_at: Date.now() };
    setToasts((curr) => [fullToast, ...curr].slice(0, TOAST_MAX_VISIBLE));
    // Schedule auto-dismiss. We don't clear on unmount — the timer will
    // just fire into a voided setState, which React handles gracefully.
    window.setTimeout(() => {
      setToasts((curr) => curr.filter((t) => t.id !== id));
    }, TOAST_AUTO_DISMISS_MS);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
  }, []);

  // ---------------------------------------------------------------------------
  // Commit helper: writes to ref + snapshot + schedules autosave + checks
  // achievements + detects event spawns. This is the single chokepoint that
  // runs after every engine action so achievement/event-toast side-effects
  // fire consistently.
  // ---------------------------------------------------------------------------

  const commit = useCallback(
    (next: GameState, opts?: { silent?: boolean }) => {
      stateRef.current = next;
      setSnapshot(next);
      if (!opts?.silent) scheduleAutosave(next);

      // ---- Detect event spawn (null → event) and queue a toast + sound ----
      const prevEvent = prevActiveEventRef.current;
      if (!prevEvent && next.active_event) {
        queueToast({
          kind: 'event',
          title: `${next.active_event.icon} ${next.active_event.name}`,
          description: 'A new opportunity! Tap to decide.',
          icon: next.active_event.icon,
          tint: next.active_event.tint,
        });
        audioEngine.play('event_spawn');
      }
      prevActiveEventRef.current = next.active_event;

      // ---- Check achievements + queue toasts + sound for newly-unlocked ----
      const { state: achState, newly_unlocked } = engine.checkAchievements(next);
      if (newly_unlocked.length > 0) {
        stateRef.current = achState;
        setSnapshot(achState);
        if (!opts?.silent) scheduleAutosave(achState);
        audioEngine.play('achievement');
        for (const def of newly_unlocked) {
          queueToast({
            kind: 'achievement',
            title: `${def.icon} ${def.name}`,
            description: def.description,
            icon: def.icon,
            tint: 'teal',
          });
        }
      }

      // ---- Record career milestones (idempotent by id) ----
      // Checks first-click, first-song, first-hire, venue unlocks, and
      // achievement unlocks. recordMilestone is a no-op if already recorded.
      let milestoneState = stateRef.current;
      const milestoneChecks: Array<{ id: string; label: string; icon: string; tint: 'pink' | 'amber' | 'teal' | 'purple' }> = [];

      // First click
      if (milestoneState.stats.total_clicks >= 1) {
        milestoneChecks.push({ id: 'ms_first_click', label: 'First Click', icon: '👣', tint: 'pink' });
      }
      // First song
      if (milestoneState.stats.total_songs_released >= 1) {
        milestoneChecks.push({ id: 'ms_first_song', label: 'First Song Released', icon: '🎵', tint: 'purple' });
      }
      // First hire (any staff count > 0)
      if (Object.values(milestoneState.staff).some((n) => n > 0)) {
        milestoneChecks.push({ id: 'ms_first_hire', label: 'First Staff Hire', icon: '🤝', tint: 'teal' });
      }
      // Venue unlocks
      for (const venueId of milestoneState.unlocked_venues) {
        if (venueId === 'venue_local_bar') continue; // skip starting venue
        const venueDef = engine.getVenueDef(venueId);
        if (venueDef) {
          milestoneChecks.push({
            id: `ms_venue_${venueId}`,
            label: `Unlocked ${venueDef.name}`,
            icon: '🎪',
            tint: 'teal',
          });
        }
      }
      // Achievement unlocks
      for (const def of newly_unlocked) {
        milestoneChecks.push({
          id: `ms_ach_${def.id}`,
          label: `Achievement: ${def.name}`,
          icon: def.icon,
          tint: 'teal',
        });
      }

      let anyMilestone = false;
      for (const check of milestoneChecks) {
        const { state: msState, milestone } = engine.recordMilestone(milestoneState, check);
        if (milestone) {
          milestoneState = msState;
          anyMilestone = true;
        }
      }
      if (anyMilestone) {
        stateRef.current = milestoneState;
        setSnapshot(milestoneState);
        if (!opts?.silent) scheduleAutosave(milestoneState);
        audioEngine.play('milestone');
      }
    },
    [scheduleAutosave, queueToast, audioEngine],
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
      if (dt > 0) {
        const next = engine.tick(prev, dt);
        stateRef.current = next;
      }

      tickCountRef.current += 1;
      const n = tickCountRef.current;

      // ---- Combo decay: reset if no click within COMBO_WINDOW_MS ----
      // This runs every tick regardless of dt so the combo counter visibly
      // ticks down even when the sim is paused (sim_speed = 0) or the tab
      // was backgrounded.
      if (comboCountRef.current > 0 && now - comboLastClickAtRef.current > COMBO_WINDOW_MS) {
        comboCountRef.current = 0;
      }

      if (n % SNAPSHOT_EVERY_N_TICKS === 0) {
        const current = stateRef.current;
        // Detect event spawn from the tick (null → event).
        const prevEvent = prevActiveEventRef.current;
        if (!prevEvent && current.active_event) {
          queueToast({
            kind: 'event',
            title: `${current.active_event.icon} ${current.active_event.name}`,
            description: 'A new opportunity! Tap to decide.',
            icon: current.active_event.icon,
            tint: current.active_event.tint,
          });
        }
        prevActiveEventRef.current = current.active_event;

        // Check achievements (O(13) per snapshot tick — cheap).
        const { state: achState, newly_unlocked } = engine.checkAchievements(current);
        if (newly_unlocked.length > 0) {
          stateRef.current = achState;
          for (const def of newly_unlocked) {
            queueToast({
              kind: 'achievement',
              title: `${def.icon} ${def.name}`,
              description: def.description,
              icon: def.icon,
              tint: 'teal',
            });
          }
        }

        setSnapshot(stateRef.current);
        // Mirror combo ref → state so the UI re-renders the counter + ring.
        setComboSnapshot({
          count: comboCountRef.current,
          multiplier: 1 + Math.min(comboCountRef.current, COMBO_MAX_COUNT) * COMBO_PER_STEP,
          last_click_at: comboLastClickAtRef.current,
        });
      }
      if (n % AUTOSAVE_EVERY_N_TICKS === 0) {
        // Direct (non-debounced) save so active play still persists even if
        // no user actions fire.
        persistGame(stateRef.current);
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
  }, [scheduleAutosave, flushAutosave, queueToast]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const click = useCallback((): ClickResult | null => {
    const now = Date.now();
    // ---- Combo computation (UI-side; engine only sees the multiplier) ----
    // If the previous click was within COMBO_WINDOW_MS, extend the combo.
    // Otherwise start a fresh chain at count 0 (this click = count 1 next time).
    const since = now - comboLastClickAtRef.current;
    const prevComboCount = comboCountRef.current;
    if (since <= COMBO_WINDOW_MS && prevComboCount > 0) {
      comboCountRef.current = Math.min(prevComboCount + 1, COMBO_MAX_COUNT);
    } else {
      comboCountRef.current = 1;
    }
    comboLastClickAtRef.current = now;
    // Multiplier for THIS click uses the post-increment count. At count 1 the
    // multiplier is 1.02; at count 50 it caps at 2.0.
    const comboMult =
      1 + Math.min(comboCountRef.current, COMBO_MAX_COUNT) * COMBO_PER_STEP;

    // ---- Audio: click sound + combo escalation at thresholds ----
    // Play combo_tick (rising pitch) at combo 3+, 5+, 10+, 20+, 50+.
    // Otherwise play the standard click sound.
    const comboHit = [3, 5, 10, 20, 50].includes(comboCountRef.current);
    if (comboHit) {
      audioEngine.playComboTick(undefined, comboCountRef.current);
    } else {
      audioEngine.play('click');
    }

    const prev = stateRef.current;
    // Record max combo BEFORE applying the click — the engine's recordMaxCombo
    // is a no-op if the new combo doesn't exceed the stored max, so this is cheap.
    const withCombo = engine.recordMaxCombo(prev, comboCountRef.current);
    const { state: next, result } = engine.clickPerform(withCombo, comboMult);
    // Stamp the combo count onto the result so the UI can show "x12 COMBO".
    result.combo_count = comboCountRef.current;
    result.combo_multiplier = comboMult;
    commit(next);
    // Mirror combo ref → state immediately so the counter feels responsive.
    setComboSnapshot({
      count: comboCountRef.current,
      multiplier: comboMult,
      last_click_at: now,
    });
    return result;
  }, [commit, audioEngine]);

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

  const resolveEvent = useCallback(
    (choiceId: string) => {
      try {
        const next = engine.resolveEvent(stateRef.current, choiceId);
        commit(next);
      } catch (err) {
        console.warn('[idol-idle] resolveEvent failed:', err);
      }
    },
    [commit],
  );

  const updateSettings = useCallback(
    (patch: Partial<GameState['settings']>) => {
      const next = engine.updateSettings(stateRef.current, patch);
      commit(next);
    },
    [commit],
  );

  const clearSave = useCallback(() => {
    wipeSave();
    const fresh = engine.initialState();
    stateRef.current = fresh;
    lastTickRef.current = Date.now();
    // Reset combo state too — a fresh game means a fresh combo chain.
    comboCountRef.current = 0;
    comboLastClickAtRef.current = 0;
    setSnapshot(fresh);
    setComboSnapshot({ count: 0, multiplier: 1, last_click_at: 0 });
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

  const debugForceEvent = useCallback(() => {
    // Set last_event_spawned_at to 0 so the next tick's spawnEventIfNeeded
    // sees >= EVENT_SPAWN_INTERVAL_MS elapsed and spawns a new event.
    // Also clear any active event so the spawn isn't blocked.
    const next = engine.cloneState(stateRef.current);
    next.last_event_spawned_at = 0;
    next.active_event = null;
    commit(next);
  }, [commit]);

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
      resolveEvent,
      updateSettings,
      clearSave,
      simulateOffline,
      debugForceEvent,
      grantResources,
    }),
    [
      click,
      buyUpgrade,
      hireStaff,
      releaseSong,
      unlockVenue,
      setVenue,
      resolveEvent,
      updateSettings,
      clearSave,
      simulateOffline,
      debugForceEvent,
      grantResources,
    ],
  );

  // ---------------------------------------------------------------------------
  // prestigeInfo is derived from snapshot (5Hz recompute is fine).
  // trend is also derived from snapshot — getTrendAt is O(1) and pure.
  // activeEvent + eventLog are direct reads from the snapshot.
  // ---------------------------------------------------------------------------

  const prestigeInfo: PrestigeInfo = useMemo(
    () => engine.getPrestigeInfo(snapshot),
    [snapshot],
  );

  const trend: TrendSnapshot = useMemo(
    () => engine.getCurrentTrend(snapshot),
    [snapshot],
  );

  const activeEvent: ActiveEvent | null = snapshot.active_event;
  const eventLog: EventLogEntry[] = snapshot.event_log;
  const unlockedAchievements: string[] = snapshot.unlocked_achievements;
  const milestones: Milestone[] = snapshot.milestones;

  const dismissOfflineSummary = useCallback(() => {
    setOfflineSummary(null);
  }, []);

  return {
    state: snapshot,
    actions,
    offlineSummary,
    dismissOfflineSummary,
    prestigeInfo,
    combo: comboSnapshot,
    trend,
    activeEvent,
    eventLog,
    achievements: engine.ACHIEVEMENTS,
    unlockedAchievements,
    milestones,
    toasts,
    dismissToast,
  };
}
