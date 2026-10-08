/**
 * Idol Idle — Pure Simulation Engine
 *
 * All functions here are PURE: given (state, action, dt) they always return
 * the same output. No IO, no Date.now() except inside initialState()'s default
 * parameter, no Math.random(). The React hook (useGameEngine) is the only
 * place that calls these functions with real wall-clock time.
 *
 * Time model:
 *   - state.last_saved_at is the authoritative in-game clock, in epoch ms.
 *   - tick(state, dtMs) advances last_saved_at by dtMs.
 *   - releaseSong uses state.last_saved_at as the song's released_at.
 *   - applyOffline(state, nowMs) jumps last_saved_at forward to nowMs and
 *     catches up production analytically.
 *
 * The hook keeps last_saved_at current by:
 *   - initialising it to Date.now() on a fresh save,
 *   - calling tick with real dt each interval,
 *   - calling applyOffline with Date.now() on mount when loading an existing
 *     save (which fast-forwards the clock).
 */

import type {
  AchievementDefinition,
  ClickResult,
  EventChoice,
  EventDefinition,
  EventLogEntry,
  GameState,
  Milestone,
  OfflineSummary,
  PrestigeInfo,
  ProductionDeltas,
  Resources,
  SongInstance,
  StaffDefinition,
  TrendPhase,
  TrendSnapshot,
  UpgradeDefinition,
} from './types';
import {
  ACHIEVEMENTS,
  EVENTS,
  SONGS,
  STAFF,
  STARTING_VENUE_ID,
  TREND_GENRES,
  UPGRADES,
  getAchievementDef,
  getEventDef,
  getSongDef,
  getStaffDef,
  getUpgradeDef,
  getVenueDef,
} from './definitions';

// Re-export definition arrays + lookups so UI agents can import from one place.
export {
  UPGRADES,
  VENUES,
  SONGS,
  STAFF,
  TREND_GENRES,
  EVENTS,
  ACHIEVEMENTS,
} from './definitions';
export {
  getUpgradeDef,
  getVenueDef,
  getSongDef,
  getStaffDef,
  getEventDef,
  getAchievementDef,
  STARTING_VENUE_ID,
} from './definitions';

// ---------------------------------------------------------------------------
// Tunable constants
// ---------------------------------------------------------------------------

const MS_PER_SECOND = 1_000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const SECONDS_PER_MINUTE = 60;

/** Click formula: base_value = P0 * (1 + a*L_perf) * (1 + b*S_marketing). */
const CLICK_A = 0.1; // per performance level
const CLICK_B = 0.05; // per marketing level

/** Per-resource split of click_value. Spec: 70/25/5. */
const CLICK_FANS_SHARE = 0.7;
const CLICK_CASH_SHARE = 0.25;
const CLICK_XP_SHARE = 0.05;

/** Per training level: +5% song quality at release. */
const SONG_QUALITY_BONUS_PER_TRAINING_LEVEL = 0.05;

/** Per lifestyle level: +1% passive staff production. */
const STAFF_LIFESTYLE_BONUS_PER_LEVEL = 0.01;

/** Base fan-production rate of a song at age 0, per second, at quality 1. */
const SONG_BASE_RATE_PER_SECOND = 0.5;

/** Offline production is applied at this fraction of the live rate. */
const OFFLINE_EFFICIENCY = 0.75;

/** Prestige unlock thresholds (LOCKED in this prototype). */
const PRESTIGE_FAN_REQ = 1_000_000;
const PRESTIGE_REP_REQ = 100;

/** Songs older than this many tau-units are pruned from state.released_songs. */
const SONG_PRUNE_TAU_MULTIPLE = 10;

// ---------------------------------------------------------------------------
// Trend tuning — see getTrendAt / getCurrentTrend below.
// ---------------------------------------------------------------------------

/**
 * Duration of one trend rotation, in ms. Tuned so a single trend lasts long
 * enough to plan a song release around it, but short enough to keep the UI
 * lively. 3 minutes is a reasonable starting point for a prototype.
 */
const TREND_DURATION_MS = 3 * MS_PER_MINUTE;

/**
 * Lifecycle phase boundaries as fractions of TREND_DURATION_MS. The phases
 * are: Emerging (0–20%), Growing (20–50%), Mainstream (50–80%), Declining
 * (80–100%). Per the brief §3.C and §4 "Trends and market dynamics".
 */
const TREND_PHASE_BOUNDARIES = {
  emerging: 0.0,
  growing: 0.2,
  mainstream: 0.5,
  declining: 0.8,
} as const;

/**
 * Song-production multipliers per phase. Songs whose genre matches the active
 * trend get this multiplier applied to their fan output. Emerging rewards
 * early adopters; Declining punishes late followers — per the brief.
 */
const TREND_PHASE_MULTIPLIERS: Record<TrendPhase, number> = {
  emerging: 1.25,
  growing: 1.6,
  mainstream: 2.0,
  declining: 0.75,
};

/**
 * Trend rotation epoch anchor. Trends are derived from
 * `(timestamp - TREND_EPOCH) % (TREND_DURATION_MS * TREND_GENRES.length)`,
 * so any timestamp maps deterministically to a single (genre, phase). The
 * epoch is arbitrary but fixed; using 0 keeps the math obvious.
 */
const TREND_EPOCH = 0;

// ---------------------------------------------------------------------------
// Event tuning — see tickEventSpawn / resolveEvent below.
// ---------------------------------------------------------------------------

/**
 * How often a new event spawns, in ms. Tuned to ~90s so events feel like a
 * regular beat without overwhelming the player. The first event doesn't
 * spawn until this much time has passed since last_event_spawned_at (which
 * starts at 0 on a fresh save, meaning the first event spawns after 90s
 * of play).
 */
const EVENT_SPAWN_INTERVAL_MS = 90 * MS_PER_SECOND;

/**
 * How long an event stays available before auto-dismissing. Tuned to 60s
 * so the player has a comfortable window to read and decide.
 */
const EVENT_DURATION_MS = 60 * MS_PER_SECOND;

/** Max entries in the event log ring buffer. Older entries are pruned. */
const EVENT_LOG_MAX = 20;

/** Max entries in the milestones timeline. Older entries are pruned. */
const MILESTONE_LOG_MAX = 50;

// ---------------------------------------------------------------------------
// State cloning
// ---------------------------------------------------------------------------

/**
 * Deep-ish clone of GameState. Arrays/objects are copied; primitives are
 * copied by value. Used by every mutating engine function to preserve
 * immutability.
 */
export function cloneState(state: GameState): GameState {
  return {
    save_version: state.save_version,
    active_era: state.active_era,
    last_saved_at: state.last_saved_at,
    resources: { ...state.resources },
    upgrades: { ...state.upgrades },
    staff: { ...state.staff },
    unlocked_venues: [...state.unlocked_venues],
    current_venue_id: state.current_venue_id,
    released_songs: state.released_songs.map((s) => ({ ...s })),
    stats: { ...state.stats },
    legacy: { ...state.legacy },
    settings: { ...state.settings },
    active_event: state.active_event
      ? {
          ...state.active_event,
          choices: state.active_event.choices.map((c) => ({ ...c, effects: { ...c.effects } })),
        }
      : null,
    last_event_spawned_at: state.last_event_spawned_at,
    event_log: state.event_log.map((e) => ({ ...e })),
    unlocked_achievements: [...state.unlocked_achievements],
    milestones: state.milestones.map((m) => ({ ...m })),
  };
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

/**
 * Return a fresh GameState. The optional nowMs keeps the function pure given
 * explicit input; the default of Date.now() is a convenience for the hook.
 */
export function initialState(nowMs: number = Date.now()): GameState {
  return {
    save_version: 1,
    active_era: 'idol',
    last_saved_at: nowMs,
    resources: { fans: 0, cash: 0, reputation: 0, experience: 0 },
    upgrades: {},
    staff: {},
    unlocked_venues: [STARTING_VENUE_ID],
    current_venue_id: STARTING_VENUE_ID,
    released_songs: [],
    stats: {
      total_clicks: 0,
      total_perf_sessions: 0,
      max_combo_achieved: 0,
      total_songs_released: 0,
      total_events_resolved: 0,
      started_at: nowMs,
    },
    legacy: { points: 0 },
    settings: {
      offline_cap_hours: 8,
      sim_speed: 1,
      sound_enabled: true,
    },
    active_event: null,
    last_event_spawned_at: nowMs,
    event_log: [],
    unlocked_achievements: [],
    milestones: [],
  };
}

/**
 * Update player settings (sim_speed, offline_cap_hours, sound_enabled).
 * Pure: returns a new state with the merged settings. Used by the hook's
 * updateSettings action.
 */
export function updateSettings(
  state: GameState,
  patch: Partial<GameState['settings']>,
): GameState {
  const next = cloneState(state);
  next.settings = { ...next.settings, ...patch };
  return next;
}

/**
 * Record the max combo achieved. Called by the hook after each click if the
 * current combo exceeds the stored max. Pure.
 */
export function recordMaxCombo(state: GameState, comboCount: number): GameState {
  if (comboCount <= state.stats.max_combo_achieved) return state;
  const next = cloneState(state);
  next.stats.max_combo_achieved = comboCount;
  return next;
}

/**
 * Record a career milestone if it hasn't been recorded already (idempotent
 * by milestone.id). Appends to the milestones array (oldest first) and
 * prunes to MILESTONE_LOG_MAX. Returns the (possibly unchanged) state plus
 * the recorded milestone (or null if it was already present / skipped).
 * Pure.
 */
export function recordMilestone(
  state: GameState,
  milestone: Omit<Milestone, 'timestamp'>,
): { state: GameState; milestone: Milestone | null } {
  // Idempotent: skip if already recorded.
  if (state.milestones.some((m) => m.id === milestone.id)) {
    return { state, milestone: null };
  }
  const full: Milestone = { ...milestone, timestamp: state.last_saved_at };
  const next = cloneState(state);
  next.milestones = [...next.milestones, full].slice(-MILESTONE_LOG_MAX);
  return { state: next, milestone: full };
}

// ---------------------------------------------------------------------------
// Cost helpers (closed-form geometric series)
// ---------------------------------------------------------------------------

/**
 * Total cash cost of buying `quantity` levels of an upgrade starting from
 * `currentLevel`. Closed form for the geometric series
 *   sum_{i=0..n-1} C0 * r^(L+i) = C0 * r^L * (r^n - 1) / (r - 1)
 */
export function upgradeCost(
  def: UpgradeDefinition,
  currentLevel: number,
  quantity: number = 1,
): number {
  if (quantity <= 0) return 0;
  const r = def.cost_growth;
  const C0 = def.base_cost;
  const L = currentLevel;
  const n = quantity;
  return (C0 * Math.pow(r, L) * (Math.pow(r, n) - 1)) / (r - 1);
}

/**
 * Maximum quantity of an upgrade buyable with the given cash, starting at
 * `currentLevel`. Closed form inverse of upgradeCost:
 *   n = floor( log_r( 1 + cash * (r - 1) / (C0 * r^L) ) )
 * Returns 0 if the player cannot afford even one level.
 */
export function maxAffordable(
  def: UpgradeDefinition,
  currentLevel: number,
  cash: number,
): number {
  const r = def.cost_growth;
  const C0 = def.base_cost;
  const L = currentLevel;
  const denom = C0 * Math.pow(r, L);
  if (denom <= 0) return 0;
  const ratio = 1 + (cash * (r - 1)) / denom;
  if (ratio <= 1) return 0;
  const n = Math.log(ratio) / Math.log(r);
  const floored = Math.floor(n);
  // Also respect max_level.
  const remaining = def.max_level - currentLevel;
  if (remaining <= 0) return 0;
  return Math.max(0, Math.min(floored, remaining));
}

/**
 * Total cash cost of hiring `quantity` staff starting from `currentCount`.
 * Same geometric-series closed form as upgradeCost.
 */
export function staffHireCost(
  def: StaffDefinition,
  currentCount: number,
  quantity: number = 1,
): number {
  if (quantity <= 0) return 0;
  const r = def.cost_growth;
  const C0 = def.base_cost_cash;
  const L = currentCount;
  const n = quantity;
  return (C0 * Math.pow(r, L) * (Math.pow(r, n) - 1)) / (r - 1);
}

/**
 * Maximum staff quantity buyable with the given cash, respecting max_hires.
 */
export function staffMaxAffordable(
  def: StaffDefinition,
  currentCount: number,
  cash: number,
): number {
  const r = def.cost_growth;
  const C0 = def.base_cost_cash;
  const L = currentCount;
  const denom = C0 * Math.pow(r, L);
  if (denom <= 0) return 0;
  const ratio = 1 + (cash * (r - 1)) / denom;
  if (ratio <= 1) return 0;
  const n = Math.log(ratio) / Math.log(r);
  const floored = Math.floor(n);
  const remaining = def.max_hires - currentCount;
  if (remaining <= 0) return 0;
  return Math.max(0, Math.min(floored, remaining));
}

// ---------------------------------------------------------------------------
// Aggregated upgrade levels (used by click + song quality + staff production)
// ---------------------------------------------------------------------------

function sumUpgradeLevelsByCategory(
  state: GameState,
  category: UpgradeDefinition['category'],
): number {
  let sum = 0;
  for (const def of UPGRADES) {
    if (def.category === category) {
      // Each upgrade contributes level * effect_per_level so e.g. Choreography
      // Coach (effect_per_level=2) counts double toward the training total.
      const level = state.upgrades[def.id] ?? 0;
      sum += level * def.effect_per_level;
    }
  }
  return sum;
}

// ---------------------------------------------------------------------------
// Actions (pure)
// ---------------------------------------------------------------------------

/**
 * Buy `quantity` levels of an upgrade. Throws if the upgrade is unknown, the
 * player can't afford it, or it's already at max level.
 */
export function buyUpgrade(
  state: GameState,
  defId: string,
  quantity: number = 1,
): GameState {
  if (quantity < 1 || !Number.isFinite(quantity)) {
    throw new Error(`Invalid quantity: ${quantity}`);
  }
  const def = getUpgradeDef(defId);
  if (!def) throw new Error(`Unknown upgrade: ${defId}`);
  const currentLevel = state.upgrades[defId] ?? 0;
  if (currentLevel >= def.max_level) {
    throw new Error(`${def.display_name} is already at max level`);
  }
  const effectiveQuantity = Math.min(
    Math.floor(quantity),
    def.max_level - currentLevel,
  );
  if (effectiveQuantity < 1) {
    throw new Error(`${def.display_name} is already at max level`);
  }
  const cost = upgradeCost(def, currentLevel, effectiveQuantity);
  if (state.resources.cash < cost) {
    throw new Error(
      `Not enough cash (need ${cost.toFixed(2)}, have ${state.resources.cash.toFixed(2)})`,
    );
  }
  const next = cloneState(state);
  next.resources.cash -= cost;
  next.upgrades[defId] = currentLevel + effectiveQuantity;
  return next;
}

/**
 * Hire `quantity` staff. Throws if the staff is unknown, the player can't
 * afford it, or it's already at max hires.
 */
export function hireStaff(
  state: GameState,
  defId: string,
  quantity: number = 1,
): GameState {
  if (quantity < 1 || !Number.isFinite(quantity)) {
    throw new Error(`Invalid quantity: ${quantity}`);
  }
  const def = getStaffDef(defId);
  if (!def) throw new Error(`Unknown staff: ${defId}`);
  const currentCount = state.staff[defId] ?? 0;
  if (currentCount >= def.max_hires) {
    throw new Error(`Max ${def.max_hires} ${def.name}(s) already hired`);
  }
  const effectiveQuantity = Math.min(
    Math.floor(quantity),
    def.max_hires - currentCount,
  );
  if (effectiveQuantity < 1) {
    throw new Error(`Max ${def.max_hires} ${def.name}(s) already hired`);
  }
  const cost = staffHireCost(def, currentCount, effectiveQuantity);
  if (state.resources.cash < cost) {
    throw new Error(
      `Not enough cash (need ${cost.toFixed(2)}, have ${state.resources.cash.toFixed(2)})`,
    );
  }
  const next = cloneState(state);
  next.resources.cash -= cost;
  next.staff[defId] = currentCount + effectiveQuantity;
  return next;
}

/**
 * Apply a click action. Click value formula:
 *   base_value = P0 * (1 + a*L_perf) * (1 + b*S_marketing) * comboMult
 * where P0 = current_venue.base_reward_fans (so Local Bar = 1, matching the
 * spec example). Fans/cash/XP are split 70/25/5 of base_value, multiplied by
 * the venue's respective reward component. Rep is the venue's per-click rep
 * reward, scaled by the upgrade multiplier.
 *
 * `comboMult` (default 1) is the UI-side combo multiplier passed in by the
 * hook. It is applied uniformly to all four resource gains, so combos scale
 * total click output without distorting the 70/25/5 split.
 *
 * Returns the new state AND a ClickResult for floating-text UI.
 */
export function clickPerform(state: GameState, comboMult: number = 1): {
  state: GameState;
  result: ClickResult;
} {
  // Defensive: clamp comboMult to a sane range so a buggy caller can't
  // trivially break the economy. Combo multiplier > 10 would be absurd.
  const safeComboMult = Number.isFinite(comboMult) && comboMult > 0
    ? Math.min(comboMult, 10)
    : 1;

  const L_perf = sumUpgradeLevelsByCategory(state, 'performance');
  const S_marketing = sumUpgradeLevelsByCategory(state, 'marketing');
  const venue = getVenueDef(state.current_venue_id);
  // Venue fallback shouldn't happen (state should always reference a valid
  // venue id), but degrade gracefully if it does.
  const P0_fans = venue ? venue.base_reward_fans : 1;
  const P0_cash = venue ? venue.base_reward_cash : 1;
  const P0_rep = venue ? venue.base_reward_rep : 0;

  const upgradeMult = (1 + CLICK_A * L_perf) * (1 + CLICK_B * S_marketing);
  // Per spec: base_value is the venue-size * upgrade-multiplier scalar.
  const base_value = P0_fans * upgradeMult * safeComboMult;

  const fans_gained = CLICK_FANS_SHARE * base_value;
  const cash_gained = CLICK_CASH_SHARE * P0_cash * upgradeMult * safeComboMult;
  const xp_gained = CLICK_XP_SHARE * base_value;
  const rep_gained = P0_rep * upgradeMult * safeComboMult;

  const next = cloneState(state);
  next.resources.fans += fans_gained;
  next.resources.cash += cash_gained;
  next.resources.experience += xp_gained;
  next.resources.reputation += rep_gained;
  next.stats.total_clicks += 1;
  next.stats.total_perf_sessions += 1;

  return {
    state: next,
    result: {
      fans_gained,
      cash_gained,
      xp_gained,
      base_value,
      combo_multiplier: safeComboMult,
      // The hook owns the combo count; we don't know it here. The hook will
      // overwrite this field on the result it returns to the UI. Default 0
      // is a safe placeholder for direct engine callers (e.g. tests).
      combo_count: 0,
    },
  };
}

/**
 * Release a song. Validates cash + rep costs, deducts them, and appends a new
 * SongInstance. Song quality is the definition's base_quality multiplied by
 * (1 + 0.05 * training levels), where training levels are aggregated across
 * all training upgrades (weighted by effect_per_level).
 */
export function releaseSong(state: GameState, songDefId: string): GameState {
  const def = getSongDef(songDefId);
  if (!def) throw new Error(`Unknown song: ${songDefId}`);
  if (state.resources.cash < def.base_cost_cash) {
    throw new Error(
      `Not enough cash (need ${def.base_cost_cash}, have ${state.resources.cash.toFixed(2)})`,
    );
  }
  if (state.resources.reputation < def.base_cost_rep) {
    throw new Error(
      `Not enough reputation (need ${def.base_cost_rep}, have ${state.resources.reputation.toFixed(2)})`,
    );
  }

  const trainingLevels = sumUpgradeLevelsByCategory(state, 'training');
  const qualityMultiplier = 1 + SONG_QUALITY_BONUS_PER_TRAINING_LEVEL * trainingLevels;
  const quality = def.base_quality * qualityMultiplier;

  const songInstance: SongInstance = {
    def_id: def.id,
    name: def.name,
    // Use the in-game clock as the release timestamp. The hook keeps
    // last_saved_at within ~100ms of wall-clock time.
    released_at: state.last_saved_at,
    quality,
    genre: def.genre,
  };

  const next = cloneState(state);
  next.resources.cash -= def.base_cost_cash;
  next.resources.reputation -= def.base_cost_rep;
  next.released_songs.push(songInstance);
  next.stats.total_songs_released += 1;
  return next;
}

/**
 * Unlock a venue (does NOT change the current venue — call setVenue for that).
 * Validates fan and reputation requirements.
 */
export function unlockVenue(state: GameState, venueDefId: string): GameState {
  const def = getVenueDef(venueDefId);
  if (!def) throw new Error(`Unknown venue: ${venueDefId}`);
  if (state.unlocked_venues.includes(venueDefId)) {
    throw new Error(`${def.name} is already unlocked`);
  }
  if (state.resources.fans < def.fan_requirement) {
    throw new Error(
      `Need ${def.fan_requirement} fans to unlock ${def.name} (have ${Math.floor(state.resources.fans)})`,
    );
  }
  if (state.resources.reputation < def.rep_requirement) {
    throw new Error(
      `Need ${def.rep_requirement} reputation to unlock ${def.name} (have ${state.resources.reputation.toFixed(2)})`,
    );
  }
  const next = cloneState(state);
  next.unlocked_venues.push(venueDefId);
  return next;
}

/** Switch the player's current venue. The venue must already be unlocked. */
export function setVenue(state: GameState, venueDefId: string): GameState {
  const def = getVenueDef(venueDefId);
  if (!def) throw new Error(`Unknown venue: ${venueDefId}`);
  if (!state.unlocked_venues.includes(venueDefId)) {
    throw new Error(`${def.name} is not unlocked yet`);
  }
  if (state.current_venue_id === venueDefId) {
    // No-op: already there. Return the same state reference for cheap callers.
    return state;
  }
  const next = cloneState(state);
  next.current_venue_id = venueDefId;
  return next;
}

// ---------------------------------------------------------------------------
// Trends (deterministic, derived from timestamp — no state field needed)
// ---------------------------------------------------------------------------

/**
 * Compute the active trend snapshot at any timestamp. Pure & deterministic:
 * the trend rotation is `(timestamp - TREND_EPOCH) mod (TREND_DURATION_MS *
 * cycle_length)`, sliced into TREND_GENRES.length equal slots, each further
 * sliced into four lifecycle phases.
 *
 * The brief §3.C / §4 calls for trends with emerging/growing/mainstream/
 * declining phases and multipliers that reward early adoption and punish
 * late followers. This implementation makes trend timing fully predictable
 * for the player (so they can plan releases) while still creating dynamic
 * pressure to time releases well.
 */
export function getTrendAt(timestampMs: number): TrendSnapshot {
  const cycleLen = TREND_GENRES.length;
  const totalCycleMs = TREND_DURATION_MS * cycleLen;
  // Clamp to non-negative; negative timestamps (pre-epoch) degrade gracefully.
  const t = Math.max(0, timestampMs - TREND_EPOCH);
  const withinCycle = t % totalCycleMs;
  const cycleIndex = Math.floor(withinCycle / TREND_DURATION_MS);
  const withinTrend = withinCycle - cycleIndex * TREND_DURATION_MS;
  const progress = withinTrend / TREND_DURATION_MS;

  const genre = TREND_GENRES[cycleIndex] ?? 'Pop';
  const phase = phaseForProgress(progress);
  const multiplier = TREND_PHASE_MULTIPLIERS[phase];
  const startedAt = TREND_EPOCH + Math.floor(t / totalCycleMs) * totalCycleMs + cycleIndex * TREND_DURATION_MS;
  const endsAt = startedAt + TREND_DURATION_MS;

  return {
    genre,
    phase,
    multiplier,
    started_at: startedAt,
    ends_at: endsAt,
    progress,
    cycle_index: cycleIndex,
    cycle_length: cycleLen,
  };
}

/** Convenience: the trend active at the simulation's current clock. */
export function getCurrentTrend(state: GameState): TrendSnapshot {
  return getTrendAt(state.last_saved_at);
}

function phaseForProgress(progress: number): TrendPhase {
  if (progress < TREND_PHASE_BOUNDARIES.growing) return 'emerging';
  if (progress < TREND_PHASE_BOUNDARIES.mainstream) return 'growing';
  if (progress < TREND_PHASE_BOUNDARIES.declining) return 'mainstream';
  return 'declining';
}

/**
 * Multiplier to apply to a song's production given its genre vs. the active
 * trend. 1.0 means no boost (song genre doesn't match the trend, or trend
 * multiplier is 1). Pure.
 */
function songTrendMultiplier(songGenre: string, trend: TrendSnapshot): number {
  return songGenre === trend.genre ? trend.multiplier : 1;
}

// ---------------------------------------------------------------------------
// Events (timed narrative choices)
// ---------------------------------------------------------------------------

/**
 * Pick which event definition should spawn at a given timestamp. Deterministic:
 * the event cycle is `floor(t / EVENT_SPAWN_INTERVAL_MS) % EVENTS.length`.
 * This means each spawn slot always picks the same event, so a player who
 * knows the cycle can predict what's coming (a nice strategic depth).
 */
export function pickEventAt(timestampMs: number): EventDefinition {
  const t = Math.max(0, timestampMs);
  const slot = Math.floor(t / EVENT_SPAWN_INTERVAL_MS);
  const idx = slot % EVENTS.length;
  return EVENTS[idx] ?? EVENTS[0];
}

/**
 * Spawn a new event if enough time has passed since the last spawn AND there
 * is no active event currently awaiting resolution. The new event's
 * expires_at is `nowMs + EVENT_DURATION_MS`. Returns the (possibly unchanged)
 * state. Pure.
 */
function spawnEventIfNeeded(state: GameState, nowMs: number): GameState {
  if (state.active_event) {
    // An event is already active — check if it has expired. If so, log it
    // as "Expired" and clear it so a new one can spawn next opportunity.
    if (nowMs >= state.active_event.expires_at) {
      const expired: EventLogEntry = {
        timestamp: state.active_event.expires_at,
        event_name: state.active_event.name,
        choice_label: 'Expired',
        outcome_text: 'You missed the window. The opportunity passed.',
        tint: state.active_event.tint,
      };
      const next = cloneState(state);
      next.active_event = null;
      next.event_log = [expired, ...next.event_log].slice(0, EVENT_LOG_MAX);
      return next;
    }
    return state;
  }
  // No active event: check if it's time to spawn a new one.
  if (nowMs - state.last_event_spawned_at < EVENT_SPAWN_INTERVAL_MS) {
    return state;
  }
  const def = pickEventAt(nowMs);
  const newEvent = {
    def_id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    tint: def.tint,
    choices: def.choices.map((c) => ({ ...c, effects: { ...c.effects } })),
    spawned_at: nowMs,
    expires_at: nowMs + EVENT_DURATION_MS,
  };
  const next = cloneState(state);
  next.active_event = newEvent;
  next.last_event_spawned_at = nowMs;
  return next;
}

/**
 * Resolve the active event by picking a choice. Applies the choice's effects,
 * records an entry in the event log, and clears the active event. Throws if
 * there's no active event or the choice id is unknown. Pure.
 */
export function resolveEvent(state: GameState, choiceId: string): GameState {
  const activeEvent = state.active_event;
  if (!activeEvent) {
    throw new Error('No active event to resolve');
  }
  const choice: EventChoice | undefined = activeEvent.choices.find(
    (c) => c.id === choiceId,
  );
  if (!choice) {
    throw new Error(`Unknown choice: ${choiceId}`);
  }
  const next = cloneState(state);
  // Apply effects (clamped at 0 for each resource so a -X effect can't
  // drive the player below zero — the brief explicitly disallows negative
  // balances). Effects are scaled by the player's current venue tier AND
  // fan count (log-scaled) so they stay relevant throughout progression.
  const mult = eventEffectMultiplier(state);
  if (typeof choice.effects.fans === 'number') {
    next.resources.fans = Math.max(0, next.resources.fans + choice.effects.fans * mult);
  }
  if (typeof choice.effects.cash === 'number') {
    next.resources.cash = Math.max(0, next.resources.cash + choice.effects.cash * mult);
  }
  if (typeof choice.effects.reputation === 'number') {
    next.resources.reputation = Math.max(
      0,
      next.resources.reputation + choice.effects.reputation * mult,
    );
  }
  if (typeof choice.effects.experience === 'number') {
    next.resources.experience = Math.max(
      0,
      next.resources.experience + choice.effects.experience * mult,
    );
  }
  const logEntry: EventLogEntry = {
    timestamp: next.last_saved_at,
    event_name: activeEvent.name,
    choice_label: choice.label,
    outcome_text: choice.outcome_text,
    tint: activeEvent.tint,
  };
  next.event_log = [logEntry, ...next.event_log].slice(0, EVENT_LOG_MAX);
  next.active_event = null;
  next.stats.total_events_resolved += 1;
  return next;
}

// ---------------------------------------------------------------------------
// Passive production
// ---------------------------------------------------------------------------

/** Addressable audience for the current venue (used for fan saturation). */
export function addressableAudience(state: GameState): number {
  const v = getVenueDef(state.current_venue_id);
  return v ? v.addressable_audience : 1_000;
}

/**
 * Compute total staff production per second (after the lifestyle bonus), used
 * both by passiveProduction and for UI display. Does NOT apply fan saturation.
 */
export function staffProductionRate(state: GameState): {
  fans: number;
  cash: number;
  reputation: number;
} {
  let fansPerSec = 0;
  let cashPerSec = 0;
  let repPerSec = 0;
  for (const def of STAFF) {
    const count = state.staff[def.id] ?? 0;
    if (count <= 0) continue;
    fansPerSec += (def.base_production_fans / SECONDS_PER_MINUTE) * count;
    cashPerSec += (def.base_production_cash / SECONDS_PER_MINUTE) * count;
    repPerSec += (def.base_production_rep / SECONDS_PER_MINUTE) * count;
  }
  const lifestyleLevels = sumUpgradeLevelsByCategory(state, 'lifestyle');
  const mult = 1 + STAFF_LIFESTYLE_BONUS_PER_LEVEL * lifestyleLevels;
  return {
    fans: fansPerSec * mult,
    cash: cashPerSec * mult,
    reputation: repPerSec * mult,
  };
}

/**
 * Current per-second fan production from all released songs, accounting for
 * exponential decay AND the active trend multiplier (songs whose genre
 * matches the current trend get boosted). Used for UI display.
 */
export function songProductionRate(state: GameState): number {
  const trend = getCurrentTrend(state);
  let total = 0;
  for (const song of state.released_songs) {
    const def = getSongDef(song.def_id);
    if (!def) continue;
    const tauMs = def.decay_tau_minutes * MS_PER_MINUTE;
    if (tauMs <= 0) continue;
    const ageMs = Math.max(0, state.last_saved_at - song.released_at);
    const trendMult = songTrendMultiplier(song.genre, trend);
    total += SONG_BASE_RATE_PER_SECOND * song.quality * Math.exp(-ageMs / tauMs) * trendMult;
  }
  return total;
}

/**
 * Compute the resource deltas produced over dtMs milliseconds.
 *
 * Staff fans are subject to logistic saturation:
 *   delta_fans = R_fans * (1 - fans / addressable_audience)
 * (per the spec). Cash and rep are unsaturated.
 *
 * Song fans are integrated analytically across the dtMs window:
 *   integral_{t1..t2} R0 * Q * exp(-t/tau) dt
 *     = R0 * Q * tau * (exp(-t1/tau) - exp(-t2/tau))
 * where t1 is the song's age at the start of the window and t2 = t1 + dtMs.
 *
 * Pure: does not modify state.
 */
export function passiveProduction(
  state: GameState,
  dtMs: number,
): ProductionDeltas {
  if (dtMs <= 0 || !Number.isFinite(dtMs)) {
    return { fans: 0, cash: 0, reputation: 0, experience: 0 };
  }
  const dtSeconds = dtMs / MS_PER_SECOND;

  // ---- Staff production ----
  const staffRate = staffProductionRate(state);
  const A = addressableAudience(state);
  const fans = state.resources.fans;
  // Per spec: linear logistic-saturation approximation per tick.
  const saturationFactor = 1 - fans / A;
  const fansFromStaff = staffRate.fans * saturationFactor * dtSeconds;
  const cashFromStaff = staffRate.cash * dtSeconds;
  const repFromStaff = staffRate.reputation * dtSeconds;

  // ---- Song production (analytical integral of exponential decay) ----
  // NOTE: we apply the trend multiplier active at the window start. For the
  // 100ms live tick this is exact. For multi-hour offline catch-up the trend
  // may rotate mid-window (cycle = 3min, cap = 8h ⇒ up to 160 rotations),
  // introducing bounded error. Acceptable for the M2 prototype; a future
  // iteration could integrate piecewise per trend segment if precision matters.
  const trend = getCurrentTrend(state);
  let fansFromSongs = 0;
  for (const song of state.released_songs) {
    const def = getSongDef(song.def_id);
    if (!def) continue;
    const tauMs = def.decay_tau_minutes * MS_PER_MINUTE;
    if (tauMs <= 0) continue;
    const ageBeforeMs = Math.max(0, state.last_saved_at - song.released_at);
    const ageAfterMs = ageBeforeMs + dtMs;
    // integral = R0 * Q * tau * (exp(-t1/tau) - exp(-t2/tau))
    // Units: R0 is per-second; tau must be in seconds to get a fans result.
    const tauSeconds = tauMs / MS_PER_SECOND;
    const trendMult = songTrendMultiplier(song.genre, trend);
    const integral =
      SONG_BASE_RATE_PER_SECOND *
      song.quality *
      tauSeconds *
      (Math.exp(-ageBeforeMs / tauMs) - Math.exp(-ageAfterMs / tauMs)) *
      trendMult;
    fansFromSongs += integral;
  }

  return {
    fans: fansFromStaff + fansFromSongs,
    cash: cashFromStaff,
    reputation: repFromStaff,
    experience: 0,
  };
}

/**
 * Advance the simulation by dtMs milliseconds. Applies passive production,
 * prunes fully-decayed songs, advances last_saved_at by dtMs, and checks for
 * event spawn/expiry. Events are NOT advanced during offline catch-up — the
 * player must be present to make choices. During offline, any active event
 * is simply cleared (the opportunity is lost). This is intentional.
 */
export function tick(state: GameState, dtMs: number): GameState {
  if (dtMs <= 0 || !Number.isFinite(dtMs)) return state;
  const next = cloneState(state);
  const deltas = passiveProduction(state, dtMs);

  next.resources.fans = Math.max(0, next.resources.fans + deltas.fans);
  next.resources.cash = Math.max(0, next.resources.cash + deltas.cash);
  next.resources.reputation = Math.max(
    0,
    next.resources.reputation + deltas.reputation,
  );
  next.resources.experience = Math.max(
    0,
    next.resources.experience + deltas.experience,
  );

  // Advance the in-game clock by dt.
  next.last_saved_at = state.last_saved_at + dtMs;

  // Prune fully-decayed songs so the array doesn't grow forever.
  // A song is pruned when its age exceeds SONG_PRUNE_TAU_MULTIPLE * tau, i.e.
  // its remaining production rate is negligible (< e^-10 ≈ 0.005% of peak).
  next.released_songs = next.released_songs.filter((song) => {
    const def = getSongDef(song.def_id);
    if (!def) return false;
    const tauMs = def.decay_tau_minutes * MS_PER_MINUTE;
    if (tauMs <= 0) return false;
    const ageMs = next.last_saved_at - song.released_at;
    return ageMs < SONG_PRUNE_TAU_MULTIPLE * tauMs;
  });

  // Check for event spawn/expiry using the advanced clock.
  return spawnEventIfNeeded(next, next.last_saved_at);
}

// ---------------------------------------------------------------------------
// Offline catch-up
// ---------------------------------------------------------------------------

/**
 * Apply offline production. dt = min(nowMs - last_saved_at, offline_cap).
 * Production is at OFFLINE_EFFICIENCY (75%) of the live rate. If dt <= 0 the
 * state is returned unchanged with a zero-summary. Jumps last_saved_at to
 * nowMs so subsequent ticks start fresh.
 */
export function applyOffline(
  state: GameState,
  nowMs: number,
): { state: GameState; summary: OfflineSummary } {
  const capMs = state.settings.offline_cap_hours * 60 * 60 * MS_PER_SECOND;
  const rawDt = nowMs - state.last_saved_at;

  const emptySummary: OfflineSummary = {
    elapsed_ms: 0,
    capped: false,
    fans_gained: 0,
    cash_gained: 0,
    rep_gained: 0,
  };

  if (!Number.isFinite(rawDt) || rawDt <= 0) {
    return { state, summary: emptySummary };
  }

  const dt = Math.min(rawDt, capMs);
  const capped = rawDt > capMs;

  const deltas = passiveProduction(state, dt);
  const fansGained = deltas.fans * OFFLINE_EFFICIENCY;
  const cashGained = deltas.cash * OFFLINE_EFFICIENCY;
  const repGained = deltas.reputation * OFFLINE_EFFICIENCY;

  const next = cloneState(state);
  next.resources.fans = Math.max(0, next.resources.fans + fansGained);
  next.resources.cash = Math.max(0, next.resources.cash + cashGained);
  next.resources.reputation = Math.max(
    0,
    next.resources.reputation + repGained,
  );
  next.last_saved_at = nowMs;

  // Clear any active event — the player wasn't present to resolve it.
  // (If we left it active, the modal would pop on return showing an event
  // that already expired. Better to just drop it.)
  if (next.active_event) {
    next.active_event = null;
  }
  // Reset the spawn clock so the first event after return spawns after a
  // full interval (not immediately).
  next.last_event_spawned_at = nowMs;

  // Also prune expired songs while we're at it (mirror tick's pruning logic).
  next.released_songs = next.released_songs.filter((song) => {
    const def = getSongDef(song.def_id);
    if (!def) return false;
    const tauMs = def.decay_tau_minutes * MS_PER_MINUTE;
    if (tauMs <= 0) return false;
    const ageMs = next.last_saved_at - song.released_at;
    return ageMs < SONG_PRUNE_TAU_MULTIPLE * tauMs;
  });

  return {
    state: next,
    summary: {
      elapsed_ms: dt,
      capped,
      fans_gained: fansGained,
      cash_gained: cashGained,
      rep_gained: repGained,
    },
  };
}

/**
 * Debug helper: simulate N minutes of offline production at 100% efficiency,
 * ignoring the offline cap. Used by the hook's simulateOffline(minutes) action.
 * Does NOT advance last_saved_at (so the live clock isn't disturbed).
 */
export function simulateOffline(
  state: GameState,
  minutes: number,
): { state: GameState; summary: OfflineSummary } {
  const dtMs = minutes * MS_PER_MINUTE;
  if (dtMs <= 0) {
    return {
      state,
      summary: {
        elapsed_ms: 0,
        capped: false,
        fans_gained: 0,
        cash_gained: 0,
        rep_gained: 0,
      },
    };
  }
  const deltas = passiveProduction(state, dtMs);
  const next = cloneState(state);
  next.resources.fans = Math.max(0, next.resources.fans + deltas.fans);
  next.resources.cash = Math.max(0, next.resources.cash + deltas.cash);
  next.resources.reputation = Math.max(
    0,
    next.resources.reputation + deltas.reputation,
  );
  return {
    state: next,
    summary: {
      elapsed_ms: dtMs,
      capped: false,
      fans_gained: deltas.fans,
      cash_gained: deltas.cash,
      rep_gained: deltas.reputation,
    },
  };
}

/**
 * Debug helper: grant arbitrary resources. Used by the hook's grantResources
 * action to fast-forward playtesting.
 */
export function grantResources(
  state: GameState,
  amount: Partial<Resources>,
): GameState {
  const next = cloneState(state);
  if (typeof amount.fans === 'number') next.resources.fans += amount.fans;
  if (typeof amount.cash === 'number') next.resources.cash += amount.cash;
  if (typeof amount.reputation === 'number')
    next.resources.reputation += amount.reputation;
  if (typeof amount.experience === 'number')
    next.resources.experience += amount.experience;
  // Clamp negatives at zero so debug grants can't de-bork state.
  next.resources.fans = Math.max(0, next.resources.fans);
  next.resources.cash = Math.max(0, next.resources.cash);
  next.resources.reputation = Math.max(0, next.resources.reputation);
  next.resources.experience = Math.max(0, next.resources.experience);
  return next;
}

// ---------------------------------------------------------------------------
// Prestige (LOCKED in this prototype — display only, never mutates state)
// ---------------------------------------------------------------------------

/**
 * True iff the player meets the prestige thresholds: 1,000,000 fans AND 100
 * reputation. The prestige action itself is locked (the UI shows a teaser).
 */
export function canPrestige(state: GameState): boolean {
  return (
    state.resources.fans >= PRESTIGE_FAN_REQ &&
    state.resources.reputation >= PRESTIGE_REP_REQ
  );
}

/**
 * Legacy points the player WOULD receive on prestige:
 *   floor( 2 * log10(1 + fans/10000) + 1 * log10(1 + reputation/10) )
 * Pure: does not modify state.
 */
export function prestigeReward(state: GameState): number {
  const fansTerm = 2 * Math.log10(1 + state.resources.fans / 10_000);
  const repTerm = 1 * Math.log10(1 + state.resources.reputation / 10);
  return Math.floor(fansTerm + repTerm);
}

/**
 * Convenience bundle the hook exposes to the UI for the locked-prestige panel.
 */
export function getPrestigeInfo(state: GameState): PrestigeInfo {
  return {
    current_requirement: '1,000,000 Fans and 100 Reputation',
    can_prestige: canPrestige(state),
    reward_preview: prestigeReward(state),
  };
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

/**
 * Check all achievement unlock conditions against the current state. Returns
 * the (possibly updated) state with newly-unlocked achievement IDs added to
 * `unlocked_achievements`, plus the list of newly-unlocked achievement
 * definitions (so the hook can queue toasts). Pure.
 *
 * Called by the hook after every commit — O(achievements) per call, which
 * is fine at 13 achievements and 5Hz snapshot cadence.
 */
export function checkAchievements(state: GameState): {
  state: GameState;
  newly_unlocked: AchievementDefinition[];
} {
  const already = new Set(state.unlocked_achievements);
  const newly: AchievementDefinition[] = [];
  for (const def of ACHIEVEMENTS) {
    if (already.has(def.id)) continue;
    if (def.check(state)) {
      newly.push(def);
    }
  }
  if (newly.length === 0) {
    return { state, newly_unlocked: [] };
  }
  const next = cloneState(state);
  next.unlocked_achievements = [...next.unlocked_achievements, ...newly.map((d) => d.id)];
  return { state: next, newly_unlocked: newly };
}

/**
 * Multiplier for scaling flat event effects by the player's current venue
 * tier AND fan count. Venue tier: Local Bar = 1×, Small Club = 2×, Theater
 * = 3×, Stadium = 4×. Fan scaling: log10(1 + fans/100) so events stay
 * relevant at high fan counts — +800 fans at 100 fans is game-changing,
 * but at 100K fans it's negligible without the log scaling (which boosts
 * it to ~800 * 3 = 2400 at 100K). The two factors multiply.
 */
function eventEffectMultiplier(state: GameState): number {
  const venue = getVenueDef(state.current_venue_id);
  const venueMult = venue ? venue.unlock_order + 1 : 1;
  const fansMult = 1 + Math.log10(1 + state.resources.fans / 100);
  return venueMult * fansMult;
}
