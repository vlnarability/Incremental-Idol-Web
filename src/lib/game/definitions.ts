/**
 * Idol Idle — Static Definitions
 *
 * Data-driven content: upgrades, venues, songs, staff. These arrays are the
 * single source of truth for the engine and the UI.
 *
 * Tuning notes (M2 slice):
 *   - 6 upgrades across 4 categories (1 performance, 2 marketing, 2 training, 1 lifestyle).
 *   - Base costs 25–500, growth 1.15–1.18 per the spec.
 *   - 4 escalating venues, addressable audience grows 1k → 1M.
 *   - 3 songs with different decay rates (4h / 3h / 2h).
 *   - 4 staff producing fans/cash/rep; Booking Agent is the all-rounder.
 */

import type {
  UpgradeDefinition,
  VenueDefinition,
  SongDefinition,
  StaffDefinition,
} from './types';

// ---------------------------------------------------------------------------
// Upgrades
// ---------------------------------------------------------------------------

export const UPGRADES: UpgradeDefinition[] = [
  {
    id: 'upg_better_microphone',
    display_name: 'Better Microphone',
    description: 'A crisp, clear mic. Your voice cuts through. +1 performance level per rank.',
    category: 'performance',
    base_cost: 25,
    cost_growth: 1.15,
    base_effect: 0,
    effect_per_level: 1,
    max_level: 50,
    effect_description_fn: (level) => `+${(0.1 * level * 100).toFixed(0)}% click value`,
  },
  {
    id: 'upg_viral_dance',
    display_name: 'Viral Dance',
    description: 'A signature move the crowd copies. +1 marketing level per rank.',
    category: 'marketing',
    base_cost: 80,
    cost_growth: 1.16,
    base_effect: 0,
    effect_per_level: 1,
    max_level: 50,
    effect_description_fn: (level) => `+${(0.05 * level * 100).toFixed(0)}% click value`,
  },
  {
    id: 'upg_social_media_push',
    display_name: 'Social Media Push',
    description: 'Boosted posts and trending hashtags. +2 marketing levels per rank.',
    category: 'marketing',
    base_cost: 150,
    cost_growth: 1.17,
    base_effect: 0,
    effect_per_level: 2,
    max_level: 40,
    effect_description_fn: (level) => `+${(0.1 * level * 100).toFixed(0)}% click value`,
  },
  {
    id: 'upg_vocal_lessons',
    display_name: 'Vocal Lessons',
    description: 'A coach refines your pitch and stamina. +1 training level per rank.',
    category: 'training',
    base_cost: 120,
    cost_growth: 1.17,
    base_effect: 0,
    effect_per_level: 1,
    max_level: 50,
    effect_description_fn: (level) => `+${(5 * level).toFixed(0)}% song quality at release`,
  },
  {
    id: 'upg_choreography_coach',
    display_name: 'Choreography Coach',
    description: 'Sharper routines mean sharper records. +2 training levels per rank.',
    category: 'training',
    base_cost: 200,
    cost_growth: 1.18,
    base_effect: 0,
    effect_per_level: 2,
    max_level: 40,
    effect_description_fn: (level) => `+${(10 * level).toFixed(0)}% song quality at release`,
  },
  {
    id: 'upg_energy_drinks',
    display_name: 'Energy Drinks',
    description: 'Caffeine and taurine. Staff work 1% harder per rank.',
    category: 'lifestyle',
    base_cost: 50,
    cost_growth: 1.15,
    base_effect: 0,
    effect_per_level: 1,
    max_level: 25,
    effect_description_fn: (level) => `+${level}% passive staff production`,
  },
];

// ---------------------------------------------------------------------------
// Venues — escalating fan/rep gates and rewards.
// ---------------------------------------------------------------------------

export const VENUES: VenueDefinition[] = [
  {
    id: 'venue_local_bar',
    name: 'Local Bar',
    description: 'A sticky-floored open-mic night. Twelve regulars, three of them sober.',
    fan_requirement: 0,
    rep_requirement: 0,
    base_reward_cash: 1,
    base_reward_fans: 1,
    base_reward_rep: 0,
    unlock_order: 0,
    addressable_audience: 1_000,
  },
  {
    id: 'venue_small_club',
    name: 'Small Club',
    description: 'A 200-cap room with a real stage. You can finally charge at the door.',
    fan_requirement: 250,
    rep_requirement: 2,
    base_reward_cash: 3,
    base_reward_fans: 3,
    base_reward_rep: 0.02,
    unlock_order: 1,
    addressable_audience: 25_000,
  },
  {
    id: 'venue_theater',
    name: 'Theater',
    description: 'A 1,000-seat venue. Your name is on the marquee.',
    fan_requirement: 5_000,
    rep_requirement: 10,
    base_reward_cash: 10,
    base_reward_fans: 15,
    base_reward_rep: 0.1,
    unlock_order: 2,
    addressable_audience: 250_000,
  },
  {
    id: 'venue_stadium',
    name: 'Stadium',
    description: 'Pyrotechnics. Jumbotrons. Forty thousand screaming fans.',
    fan_requirement: 100_000,
    rep_requirement: 50,
    base_reward_cash: 40,
    base_reward_fans: 80,
    base_reward_rep: 1,
    unlock_order: 3,
    addressable_audience: 1_000_000,
  },
];

// ---------------------------------------------------------------------------
// Songs — escalating cost, quality, and faster decay.
// ---------------------------------------------------------------------------

export const SONGS: SongDefinition[] = [
  {
    id: 'song_debut_single',
    name: 'Debut Single',
    description: 'A bubbly three-minute pop track. Cheap to record, slow to decay.',
    base_cost_cash: 100,
    base_cost_rep: 0,
    base_quality: 1.0,
    decay_tau_minutes: 240, // 4h
    genre: 'Pop',
  },
  {
    id: 'song_catching_vibe',
    name: 'Catching the Vibe',
    description: 'A polished J-Pop anthem with a hook that sticks for days.',
    base_cost_cash: 1_000,
    base_cost_rep: 2,
    base_quality: 2.0,
    decay_tau_minutes: 180, // 3h
    genre: 'J-Pop',
  },
  {
    id: 'song_hypnotic',
    name: 'Hypnotic',
    description: 'A high-energy EDM banger. Massive spike, rapid decay.',
    base_cost_cash: 10_000,
    base_cost_rep: 10,
    base_quality: 4.0,
    decay_tau_minutes: 120, // 2h
    genre: 'EDM',
  },
];

// ---------------------------------------------------------------------------
// Staff — 4 roles producing fans/cash/rep respectively (Booking Agent = all).
// ---------------------------------------------------------------------------

export const STAFF: StaffDefinition[] = [
  {
    id: 'staff_assistant',
    name: 'Assistant',
    role: 'assistant',
    description: 'Handles social posts and fan mail. Steady trickle of new fans.',
    base_cost_cash: 50,
    cost_growth: 1.15,
    base_production_fans: 10,
    base_production_cash: 0,
    base_production_rep: 0,
    produces_per: 'minute',
    max_hires: 50,
  },
  {
    id: 'staff_coach',
    name: 'Coach',
    role: 'coach',
    description: 'Refines your stage presence. Builds industry reputation slowly.',
    base_cost_cash: 250,
    cost_growth: 1.16,
    base_production_fans: 0,
    base_production_cash: 0,
    base_production_rep: 0.2,
    produces_per: 'minute',
    max_hires: 25,
  },
  {
    id: 'staff_producer',
    name: 'Producer',
    role: 'producer',
    description: 'Licenses your back catalog and negotiates sync deals. Pure cash.',
    base_cost_cash: 1_000,
    cost_growth: 1.17,
    base_production_fans: 0,
    base_production_cash: 15,
    base_production_rep: 0,
    produces_per: 'minute',
    max_hires: 30,
  },
  {
    id: 'staff_booking_agent',
    name: 'Booking Agent',
    role: 'booking_agent',
    description: 'A well-connected agent. Books bigger gigs across the board.',
    base_cost_cash: 5_000,
    cost_growth: 1.18,
    base_production_fans: 50,
    base_production_cash: 30,
    base_production_rep: 1,
    produces_per: 'minute',
    max_hires: 10,
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers (single-source-of-truth: the arrays above).
// ---------------------------------------------------------------------------

export function getUpgradeDef(id: string): UpgradeDefinition | undefined {
  return UPGRADES.find((u) => u.id === id);
}

export function getVenueDef(id: string): VenueDefinition | undefined {
  return VENUES.find((v) => v.id === id);
}

export function getSongDef(id: string): SongDefinition | undefined {
  return SONGS.find((s) => s.id === id);
}

export function getStaffDef(id: string): StaffDefinition | undefined {
  return STAFF.find((s) => s.id === id);
}

/** The starting venue id (always unlocked on a fresh GameState). */
export const STARTING_VENUE_ID = 'venue_local_bar';
