/**
 * Idol Idle — Save Persistence (localStorage)
 *
 * Single autosave slot. loadGame validates basic shape and applies sensible
 * defaults for any missing fields so older saves survive a schema bump.
 * saveGame and clearSave are safe to call during SSR (they no-op when
 * window is undefined).
 */

import type { GameState } from './types';
import { STARTING_VENUE_ID } from './definitions';

/** localStorage key. Bumped only on a breaking save schema change. */
export const SAVE_KEY = 'idol-idle-save-v1';

const CURRENT_SAVE_VERSION = 1;

/**
 * Load and validate the save. Returns {state, error}; state is null if the
 * save is missing or unrepairably corrupt. The validated state is what the
 * hook feeds into applyOffline for catch-up.
 */
export function loadGame(): {
  state: GameState | null;
  error: string | null;
} {
  if (typeof window === 'undefined') {
    return { state: null, error: 'Not running in a browser' };
  }
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (raw === null) return { state: null, error: null };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { state: null, error: 'Save is not an object' };
    }
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.save_version !== 'number') {
      return { state: null, error: 'Missing or invalid save_version' };
    }
    const resourcesIn = obj.resources as Record<string, unknown> | undefined;
    if (!resourcesIn || typeof resourcesIn !== 'object') {
      return { state: null, error: 'Missing resources object' };
    }
    for (const key of ['fans', 'cash', 'reputation', 'experience'] as const) {
      if (typeof resourcesIn[key] !== 'number') {
        return {
          state: null,
          error: `Invalid resource: ${key}`,
        };
      }
    }

    // Assemble state with defaults for any optional / newly-added fields.
    const state: GameState = {
      save_version: CURRENT_SAVE_VERSION,
      active_era: obj.active_era === 'idol' ? 'idol' : 'idol',
      last_saved_at:
        typeof obj.last_saved_at === 'number' ? obj.last_saved_at : Date.now(),
      resources: {
        fans: (resourcesIn as { fans: number }).fans,
        cash: (resourcesIn as { cash: number }).cash,
        reputation: (resourcesIn as { reputation: number }).reputation,
        experience: (resourcesIn as { experience: number }).experience,
      },
      upgrades:
        (obj.upgrades as Record<string, number> | undefined) ?? {},
      staff: (obj.staff as Record<string, number> | undefined) ?? {},
      unlocked_venues:
        Array.isArray(obj.unlocked_venues) &&
        (obj.unlocked_venues as unknown[]).every(
          (v) => typeof v === 'string',
        )
          ? (obj.unlocked_venues as string[])
          : [STARTING_VENUE_ID],
      current_venue_id:
        typeof obj.current_venue_id === 'string'
          ? obj.current_venue_id
          : STARTING_VENUE_ID,
      released_songs: Array.isArray(obj.released_songs)
        ? (obj.released_songs as GameState['released_songs']).filter(
            (s) =>
              s &&
              typeof s === 'object' &&
              typeof s.def_id === 'string' &&
              typeof s.name === 'string' &&
              typeof s.released_at === 'number' &&
              typeof s.quality === 'number' &&
              typeof s.genre === 'string',
          )
        : [],
      stats:
        obj.stats && typeof obj.stats === 'object'
          ? {
              total_clicks:
                typeof (obj.stats as { total_clicks?: number }).total_clicks ===
                'number'
                  ? (obj.stats as { total_clicks: number }).total_clicks
                  : 0,
              total_perf_sessions:
                typeof (obj.stats as { total_perf_sessions?: number })
                  .total_perf_sessions === 'number'
                  ? (obj.stats as { total_perf_sessions: number })
                      .total_perf_sessions
                  : 0,
              max_combo_achieved:
                typeof (obj.stats as { max_combo_achieved?: number })
                  .max_combo_achieved === 'number'
                  ? (obj.stats as { max_combo_achieved: number })
                      .max_combo_achieved
                  : 0,
              total_songs_released:
                typeof (obj.stats as { total_songs_released?: number })
                  .total_songs_released === 'number'
                  ? (obj.stats as { total_songs_released: number })
                      .total_songs_released
                  : 0,
              total_events_resolved:
                typeof (obj.stats as { total_events_resolved?: number })
                  .total_events_resolved === 'number'
                  ? (obj.stats as { total_events_resolved: number })
                      .total_events_resolved
                  : 0,
              started_at:
                typeof (obj.stats as { started_at?: number }).started_at ===
                'number'
                  ? (obj.stats as { started_at: number }).started_at
                  : Date.now(),
            }
          : {
              total_clicks: 0,
              total_perf_sessions: 0,
              max_combo_achieved: 0,
              total_songs_released: 0,
              total_events_resolved: 0,
              started_at: Date.now(),
            },
      legacy:
        obj.legacy && typeof obj.legacy === 'object'
          ? {
              points:
                typeof (obj.legacy as { points?: number }).points === 'number'
                  ? (obj.legacy as { points: number }).points
                  : 0,
            }
          : { points: 0 },
      settings:
        obj.settings && typeof obj.settings === 'object'
          ? {
              offline_cap_hours:
                typeof (obj.settings as { offline_cap_hours?: number })
                  .offline_cap_hours === 'number'
                  ? (obj.settings as { offline_cap_hours: number })
                      .offline_cap_hours
                  : 8,
              sim_speed:
                typeof (obj.settings as { sim_speed?: number }).sim_speed ===
                'number'
                  ? (obj.settings as { sim_speed: number }).sim_speed
                  : 1,
              sound_enabled:
                typeof (obj.settings as { sound_enabled?: boolean })
                  .sound_enabled === 'boolean'
                  ? (obj.settings as { sound_enabled: boolean }).sound_enabled
                  : true,
            }
          : {
              offline_cap_hours: 8,
              sim_speed: 1,
              sound_enabled: true,
            },
      // Events: new in save v1 (additive — old saves get null + empty log).
      // If active_event is present, validate its shape; otherwise null.
      active_event:
        obj.active_event && typeof obj.active_event === 'object'
          ? (obj.active_event as GameState['active_event'])
          : null,
      last_event_spawned_at:
        typeof obj.last_event_spawned_at === 'number'
          ? obj.last_event_spawned_at
          : typeof obj.last_saved_at === 'number'
            ? obj.last_saved_at
            : Date.now(),
      event_log: Array.isArray(obj.event_log)
        ? (obj.event_log as GameState['event_log']).filter(
            (e) =>
              e &&
              typeof e === 'object' &&
              typeof e.event_name === 'string' &&
              typeof e.choice_label === 'string',
          )
        : [],
      // Achievements: new field. Old saves get empty array.
      unlocked_achievements:
        Array.isArray(obj.unlocked_achievements) &&
        (obj.unlocked_achievements as unknown[]).every(
          (v) => typeof v === 'string',
        )
          ? (obj.unlocked_achievements as string[])
          : [],
    };

    return { state, error: null };
  } catch (e) {
    return {
      state: null,
      error: e instanceof Error ? e.message : 'Failed to parse save',
    };
  }
}

/** Persist state to localStorage. Safe during SSR (no-op). */
export function saveGame(state: GameState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    // Quota exceeded / private mode / etc. We don't surface this to the user
    // (an idle game degrading to "no save" is fine), but we do log it.
    console.error('[idol-idle] saveGame failed:', e);
  }
}

/** Remove the save. Safe during SSR (no-op). */
export function clearSave(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.error('[idol-idle] clearSave failed:', e);
  }
}
