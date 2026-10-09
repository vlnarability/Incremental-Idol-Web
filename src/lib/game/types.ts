/**
 * Idol Idle — Game Engine Type Definitions
 *
 * Pure TypeScript types for the simulation engine. No runtime values here.
 * The simulation is deterministic given (state, action, dt).
 */

import type { IdolStats } from './idols';

/** The three core resources tracked in GameState.resources. */
export type ResourceType = 'fans' | 'cash' | 'fame';

/** Upgrade categories. Used both for filtering and for click-formula aggregation. */
export type UpgradeCategory = 'performance' | 'marketing' | 'training' | 'lifestyle';

/** Staff roles. */
export type StaffRole = 'assistant' | 'coach' | 'producer' | 'booking_agent';

/** The current era. The M2 slice only includes the idol era; future eras may expand this union. */
export type Era = 'idol';

/** Resource bag. All values are floating-point; UI formats them on display. */
export interface Resources {
  fans: number;
  cash: number;
  /** Fame = public perception. Can go negative (displayed as "Infamy"). Replaces the old Reputation. */
  fame: number;
}

/** A song released by the player that passively produces fans while decaying. */
export interface SongInstance {
  def_id: string;
  name: string;
  /** Epoch ms when the song was released. */
  released_at: number;
  /** Quality multiplier (modified by training upgrades at release time). */
  quality: number;
  genre: string;
}

/** Aggregate stats for the play session — never consumed by the engine loop, just for display. */
export interface GameStats {
  total_clicks: number;
  total_perf_sessions: number;
  /** Highest combo count the player has ever achieved in this save. Updated by the hook on every click. */
  max_combo_achieved: number;
  /** Lifetime count of songs released (never decremented, even if songs decay). */
  total_songs_released: number;
  /** Lifetime count of events resolved (never decremented, even if the log is pruned). */
  total_events_resolved: number;
  /** Epoch ms when this save was first created. */
  started_at: number;
}

/** Prestige currency. Always 0 in this prototype (prestige is locked). */
export interface Legacy {
  points: number;
}

/** Player-tunable settings. */
export interface GameSettings {
  /** Max hours of offline catch-up that will be applied on mount. */
  offline_cap_hours: number;
  /** Simulation speed multiplier (1 = real time). */
  sim_speed: number;
  sound_enabled: boolean;
  /** When true, no new events spawn (existing active event still resolves). Debug/QA aid. */
  events_paused: boolean;
}

/**
 * Authoritative game state. All engine functions take this and return a new
 * immutable copy. NO side effects, NO IO.
 */
export interface GameState {
  save_version: number;
  active_era: Era;
  /** Epoch ms of the last tick or save. Used for offline catch-up and song-age math. */
  last_saved_at: number;
  /** The player's chosen idol archetype id (e.g. 'cute_female'). Set at character creation. */
  chosen_archetype: string;
  /** The idol's trainable stats. Grow via training + performing. */
  idol_stats: IdolStats;
  /** Current energy (action points). Spent on Train/Social/Go Out. Resets on End Week (Perform). */
  energy: number;
  /** Max energy per week. Upgrades can increase this. */
  max_energy: number;
  /** Current week number (increments on each End Week / Performance). */
  week: number;
  /** Progression level: 1=Solo Idol, 2=Group Center, 3=Agency Manager, etc. */
  progression_level: number;
  /** Tutorial step (0-6). 0=start, 6=done. */
  tutorial_step: number;
  resources: Resources;
  /** Upgrade id → level (0 if absent). */
  upgrades: Record<string, number>;
  /** Staff id → count hired (0 if absent). */
  staff: Record<string, number>;
  /** Venue ids the player has unlocked. The starting venue ('venue_local_bar') is always present. */
  unlocked_venues: string[];
  /** The venue the player is currently performing at. */
  current_venue_id: string;
  /** Songs released by the player, oldest first. */
  released_songs: SongInstance[];
  stats: GameStats;
  legacy: Legacy;
  settings: GameSettings;
  /**
   * Active timed event awaiting player decision, or null. Spawns on a fixed
   * schedule (see engine.tickEventSpawn). When present, the UI shows a modal.
   */
  active_event: ActiveEvent | null;
  /** Timestamp (epoch ms) when the last event was spawned. Drives the spawn cadence. */
  last_event_spawned_at: number;
  /** Ring buffer of recent event outcomes, newest first. Capped at EVENT_LOG_MAX. */
  event_log: EventLogEntry[];
  /** IDs of achievements the player has unlocked. Persisted across sessions. */
  unlocked_achievements: string[];
  /** Career milestones in chronological order (oldest first). Capped at MILESTONE_LOG_MAX. */
  milestones: Milestone[];
}

/** A choice the player can make when resolving an active event. */
export interface EventChoice {
  id: string;
  /** Short label, e.g. "Ride the wave". */
  label: string;
  /** One-line description of what happens, e.g. "+500 fans, -3 fame". */
  description: string;
  /** Resource deltas applied when this choice is picked. */
  effects: Partial<Resources>;
  /** Optional flavor text shown after resolving, e.g. "The internet loved it." */
  outcome_text: string;
}

/** Static definition of an event that can spawn. */
export interface EventDefinition {
  id: string;
  /** Display name, e.g. "Viral Moment". */
  name: string;
  /** Narrative description shown in the modal. */
  description: string;
  /** Emoji or short symbol for compact display. */
  icon: string;
  /** Themed tint for the modal. */
  tint: 'pink' | 'amber' | 'teal' | 'purple';
  /** Choices the player can pick. */
  choices: EventChoice[];
}

/** A live instance of an event spawned in GameState. */
export interface ActiveEvent {
  def_id: string;
  name: string;
  description: string;
  icon: string;
  tint: EventDefinition['tint'];
  choices: EventChoice[];
  /** Epoch ms when this event spawned. */
  spawned_at: number;
  /** Epoch ms when this event auto-dismisses (spawned_at + EVENT_DURATION_MS). */
  expires_at: number;
}

/** A resolved event recorded in the log. */
export interface EventLogEntry {
  /** Epoch ms when the player resolved (or the event expired). */
  timestamp: number;
  event_name: string;
  /** Label of the chosen option, or "Expired" if it timed out. */
  choice_label: string;
  outcome_text: string;
  tint: EventDefinition['tint'];
}

/**
 * A career milestone — a significant moment in the player's progression.
 * Recorded by the hook when key actions happen (first click, first song,
 * first hire, venue unlock, achievement unlock). Persisted in GameState.
 */
export interface Milestone {
  /** Stable id, e.g. 'first_click', 'venue_small_club', 'ach_1k_fans'. */
  id: string;
  /** Display label, e.g. 'First Click', 'Unlocked Small Club'. */
  label: string;
  /** Emoji shown in the timeline. */
  icon: string;
  /** Epoch ms when this milestone was recorded. */
  timestamp: number;
  /** Themed tint matching the milestone's category. */
  tint: 'pink' | 'amber' | 'teal' | 'purple';
}

// ---------------------------------------------------------------------------
// Achievements — long-term goals with unlock conditions checked from state.
// Per the brief §3.E "Achievements that encourage unusual builds" and
// §8 "optional challenges with specific constraints".
// ---------------------------------------------------------------------------

/**
 * Static definition of an achievement. The `check` predicate is pure: given
 * the current GameState, return true iff the achievement is now unlocked.
 * The hook calls checkAchievements after every commit and queues a toast
 * for any newly-unlocked ones.
 */
export interface AchievementDefinition {
  id: string;
  /** Display name, e.g. "Going Viral". */
  name: string;
  /** One-line description, e.g. "Reach 1,000 fans". */
  description: string;
  /** Emoji shown in the toast, modal, and unlocked badge. */
  icon: string;
  /** Optional hint about current progress toward this achievement (e.g. "723 / 1,000 fans"). */
  progress_fn?: (state: GameState) => { current: number; target: number } | null;
  /** Pure predicate: true iff the achievement should be unlocked. */
  check: (state: GameState) => boolean;
}

/** UI-facing toast notification for game events (achievement unlock, event spawn, milestone). */
export interface GameToast {
  id: number;
  kind: 'achievement' | 'event' | 'milestone';
  title: string;
  description?: string;
  icon: string;
  tint: 'pink' | 'amber' | 'teal' | 'purple';
  /** Epoch ms when the toast was queued. Used for auto-dismiss timing. */
  queued_at: number;
}

/** Lifecycle phase of a trend. Drives the production multiplier. */
export type TrendPhase = 'emerging' | 'growing' | 'mainstream' | 'declining';

/**
 * Snapshot of the currently-active trend at a given moment. Derived purely
 * from a timestamp (see engine.getTrendAt) — not stored in GameState. This
 * keeps the save lean and the trend rotation perfectly deterministic.
 */
export interface TrendSnapshot {
  /** Display genre label, e.g. "J-Pop". */
  genre: string;
  /** Current lifecycle phase. */
  phase: TrendPhase;
  /** Multiplier applied to song production whose genre matches `genre`. */
  multiplier: number;
  /** Epoch-ms when this trend rotation started. */
  started_at: number;
  /** Epoch-ms when this trend rotation ends (next trend begins). */
  ends_at: number;
  /** Progress through the trend lifecycle, 0..1. */
  progress: number;
  /** Index into the trend cycle (so UI can show "Trend 3 of 5" etc.). */
  cycle_index: number;
  /** Total number of genres in the cycle. */
  cycle_length: number;
}

/** Static definition for a buyable upgrade. */
export interface UpgradeDefinition {
  id: string;
  display_name: string;
  description: string;
  category: UpgradeCategory;
  /** Cash cost at level 0 → level 1. */
  base_cost: number;
  /** Geometric growth rate per level (e.g. 1.15 = +15% per level). */
  cost_growth: number;
  /** Effect value at level 0 (often 0). */
  base_effect: number;
  /** Effect delta per level (e.g. 1 means each level adds 1 to the category's aggregated sum). */
  effect_per_level: number;
  max_level: number;
  /** Optional tooltip generator describing the effect at a given level. */
  effect_description_fn?: (level: number) => string;
}

/** Static definition for a venue the player can perform at. */
export interface VenueDefinition {
  id: string;
  name: string;
  description: string;
  /** Fans required to unlock this venue. */
  fan_requirement: number;
  /** Fame required to unlock this venue. */
  fame_requirement: number;
  /** Cash component granted per click at this venue (multiplied by upgrade factor). */
  base_reward_cash: number;
  /** Fan component granted per click at this venue (acts as P0 in click formula). */
  base_reward_fans: number;
  /** Fame granted per click at this venue (typically 0 for the starting venue). */
  base_reward_fame: number;
  /** Order in which venues unlock (Local Bar = 0). */
  unlock_order: number;
  /** Minimum progression level required to access this venue (1=Solo, 2=Group, 3=Agency). */
  min_progression_level: number;
  /**
   * Maximum fans the venue can sustainably hold. Passive fan production uses
   * logistic saturation against this value: delta_fans = R * (1 - fans / A).
   */
  addressable_audience: number;
}

/** Static definition for a song the player can release. */
export interface SongDefinition {
  id: string;
  name: string;
  description: string;
  /** Fans required to unlock this song (milestone-based, not buyable). */
  fan_unlock: number;
  /** Base quality multiplier at release (before training bonus). */
  base_quality: number;
  /** Time constant for exponential production decay, in minutes. */
  decay_tau_minutes: number;
  genre: string;
}

/** Static definition for a coach that boosts the training-click amount of a specific stat. */
export interface StaffDefinition {
  id: string;
  name: string;
  role: StaffRole;
  description: string;
  base_cost_cash: number;
  cost_growth: number;
  /** Which stat this coach boosts the training click amount for. */
  stat: 'vocals' | 'dance' | 'charisma' | 'charm';
  /** How much each coach level adds to the training click amount for this stat. */
  train_boost: number;
  /** Upgrade cap (use 999999 for effectively infinite). */
  max_hires: number;
}

/** Locked-prestige info bundle, recomputed from GameState by the hook. */
export interface PrestigeInfo {
  /** Human-readable requirement text for tooltip / modal. */
  current_requirement: string;
  can_prestige: boolean;
  /** Legacy points the player WOULD receive if they could prestige now. */
  reward_preview: number;
}

/** Result of a click action; the UI may use this for floating "+X fans" text. */
export interface ClickResult {
  fans_gained: number;
  cash_gained: number;
  /** Total click value before per-resource split — used for floating text. */
  base_value: number;
  /** Combo multiplier that was applied to this click (1.0 = no combo). */
  combo_multiplier: number;
  /** Combo count at the moment of this click (0 = first click in a chain). */
  combo_count: number;
}

/**
 * UI-side combo state. Lives in the React hook (not in GameState) because
 * combo is a real-time input-timing concept that has no meaning in the
 * deterministic simulation. The hook tracks click cadence and passes the
 * multiplier into engine.clickPerform.
 */
export interface ComboState {
  /** Current combo count (resets to 0 after COMBO_WINDOW_MS of no clicks). */
  count: number;
  /** Multiplier that will apply to the next click: 1 + min(count, MAX) * 0.02. */
  multiplier: number;
  /** Epoch-ms of the last click. Used by the UI to render the decay ring. */
  last_click_at: number;
}

/** Resource deltas produced over a time interval. */
export interface ProductionDeltas {
  fans: number;
  cash: number;
  /** Fame deltas (kept under the legacy key `reputation` for minimal blast radius). */
  reputation: number;
}

/** Summary of offline catch-up, surfaced to the UI as a modal. */
export interface OfflineSummary {
  elapsed_ms: number;
  /** True if the offline period exceeded the player's offline cap. */
  capped: boolean;
  fans_gained: number;
  cash_gained: number;
  rep_gained: number;
}
