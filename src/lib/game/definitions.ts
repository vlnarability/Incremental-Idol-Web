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
    // Balance: lowered from 25→15 so the first upgrade is reachable in ~5 clicks.
    base_cost: 15,
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
  {
    id: 'upg_dance_instructor',
    display_name: 'Dance Instructor',
    description: 'A pro dancer sharpens your moves. +2 performance levels per rank.',
    category: 'performance',
    base_cost: 300,
    cost_growth: 1.18,
    base_effect: 0,
    effect_per_level: 2,
    max_level: 40,
    effect_description_fn: (level) => `+${(0.2 * level * 100).toFixed(0)}% click value`,
  },
  {
    id: 'upg_fan_club',
    display_name: 'Fan Club',
    description: 'An organized fan base that amplifies your reach. +3 marketing levels per rank.',
    category: 'marketing',
    base_cost: 500,
    cost_growth: 1.19,
    base_effect: 0,
    effect_per_level: 3,
    max_level: 30,
    effect_description_fn: (level) => `+${(0.15 * level * 100).toFixed(0)}% click value`,
  },
  {
    id: 'upg_stage_wardrobe',
    display_name: 'Stage Wardrobe',
    description: 'Iconic outfits that make you unforgettable. +2% staff production per rank.',
    category: 'lifestyle',
    base_cost: 250,
    cost_growth: 1.17,
    base_effect: 0,
    effect_per_level: 2,
    max_level: 30,
    effect_description_fn: (level) => `+${level * 2}% passive staff production`,
  },
  {
    id: 'upg_music_theory',
    display_name: 'Music Theory',
    description: 'Study composition and harmony. +3 training levels per rank.',
    category: 'training',
    base_cost: 400,
    cost_growth: 1.19,
    base_effect: 0,
    effect_per_level: 3,
    max_level: 30,
    effect_description_fn: (level) => `+${(15 * level).toFixed(0)}% song quality at release`,
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
    // Balance: increased from 1→2 so the first few clicks feel rewarding.
    base_reward_cash: 2,
    base_reward_fans: 2,
    // Tiny rep per click so dedicated players can bootstrap rep without
    // needing to grind 1000+ clicks for a Coach first.
    base_reward_rep: 0.005,
    unlock_order: 0,
    addressable_audience: 1_000,
  },
  {
    id: 'venue_small_club',
    name: 'Small Club',
    description: 'A 200-cap room with a real stage. You can finally charge at the door.',
    // Balance: lowered from 250→200 for faster early progression.
    fan_requirement: 200,
    // Lowered from 2 → 1 so it's reachable with ~100 Local Bar clicks.
    rep_requirement: 1,
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
  {
    id: 'song_moonlight_ballad',
    name: 'Moonlight Ballad',
    description: 'A hauntingly beautiful slow ballad. Lingers in the charts for ages.',
    base_cost_cash: 5_000,
    base_cost_rep: 5,
    base_quality: 3.0,
    decay_tau_minutes: 360, // 6h — very slow decay
    genre: 'J-Pop',
  },
  {
    id: 'song_neon_pulse',
    name: 'Neon Pulse',
    description: 'A synthwave track with retro vibes. Moderate cost, balanced output.',
    base_cost_cash: 25_000,
    base_cost_rep: 20,
    base_quality: 5.0,
    decay_tau_minutes: 150, // 2.5h
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
    // Balance: increased from 50→40 so the first hire is cheaper.
    base_cost_cash: 40,
    cost_growth: 1.15,
    // Balance: increased from 10→15 fans/min for better early passive income.
    base_production_fans: 15,
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

// ---------------------------------------------------------------------------
// Trends — genres that cycle on a fixed rotation. The engine derives the
// active trend at any timestamp from this list (see engine.getTrendAt). No
// state needs to be persisted; the rotation is purely time-based.
// ---------------------------------------------------------------------------

/**
 * Genres that trends rotate through. Each genre's songs (matching by
 * SongDefinition.genre) get a production multiplier while that genre's
 * trend is active. Order is fixed so the rotation is deterministic.
 */
export const TREND_GENRES: readonly string[] = [
  'Pop',
  'J-Pop',
  'EDM',
  'Pop', // Pop appears twice in the cycle to weight it slightly heavier
  'J-Pop',
] as const;

// ---------------------------------------------------------------------------
// Events — timed narrative choices that present risk/reward decisions.
// Per the brief §4 "Controversy and scandals", "Rival idols", etc.
// Events spawn on a fixed schedule and present 2-3 choices with effects.
// The event definition is picked deterministically from a cycle (like trends).
// ---------------------------------------------------------------------------

import type { EventDefinition } from './types';

export const EVENTS: EventDefinition[] = [
  {
    id: 'event_viral_moment',
    name: 'Viral Moment',
    description:
      'A clip of your last performance is blowing up online. Everyone is talking about you — but not all of them nicely.',
    icon: '🔥',
    tint: 'pink',
    choices: [
      {
        id: 'ride_wave',
        label: 'Ride the wave',
        description: '+800 fans, but -2 rep (the purists are annoyed)',
        effects: { fans: 800, reputation: -2 },
        outcome_text: 'The internet loved it. The critics… less so.',
      },
      {
        id: 'stay_humble',
        label: 'Stay humble',
        description: '+150 fans, +2 rep (your manager approves)',
        effects: { fans: 150, reputation: 2 },
        outcome_text: 'A classy move. Industry insiders nod approvingly.',
      },
    ],
  },
  {
    id: 'event_endorsement',
    name: 'Endorsement Offer',
    description:
      'A lifestyle brand wants you to front their new campaign. Big money on the table — but selling out has a cost.',
    icon: '💰',
    tint: 'amber',
    choices: [
      {
        id: 'take_deal',
        label: 'Take the deal',
        description: '+1,500 cash, -3 rep (your indie cred takes a hit)',
        effects: { cash: 1500, reputation: -3 },
        outcome_text: 'You can buy a lot of microphones now.',
      },
      {
        id: 'decline',
        label: 'Politely decline',
        description: '+1 rep (principled!)',
        effects: { reputation: 1 },
        outcome_text: 'Your fans respect the integrity. Mostly.',
      },
    ],
  },
  {
    id: 'event_scandal',
    name: 'Tabloid Rumor',
    description:
      'A gossip site just published a rumor about you. It\'s mostly nonsense, but the comments are eating it up.',
    icon: '📰',
    tint: 'purple',
    choices: [
      {
        id: 'address_publicly',
        label: 'Address it publicly',
        description: '-200 fans, +3 rep (honesty wins long-term)',
        effects: { fans: -200, reputation: 3 },
        outcome_text: 'Your statement is called " refreshingly direct ".',
      },
      {
        id: 'ignore_it',
        label: 'Ignore the noise',
        description: '+0 (it\'ll blow over… probably)',
        effects: {},
        outcome_text: 'The story fizzles in 48 hours. Mostly.',
      },
    ],
  },
  {
    id: 'event_collab',
    name: 'Collab Offer',
    description:
      'A bigger artist wants to feature you on their next track. Good exposure, but the studio fee stings.',
    icon: '🎤',
    tint: 'teal',
    choices: [
      {
        id: 'accept_collab',
        label: 'Accept the feature',
        description: '+600 fans, +2 rep, -400 cash (studio time)',
        effects: { fans: 600, reputation: 2, cash: -400 },
        outcome_text: 'The track drops next month. Hype builds.',
      },
      {
        id: 'decline_collab',
        label: 'Decline — stay solo',
        description: '+50 fans, +1 rep (mysterious!)',
        effects: { fans: 50, reputation: 1 },
        outcome_text: 'They respect your independence. Or so they say.',
      },
    ],
  },
  {
    id: 'event_inspiration',
    name: 'Stroke of Inspiration',
    description:
      'You wake up at 3 AM with a melody in your head. This could become something — or it could become nothing.',
    icon: '✨',
    tint: 'teal',
    choices: [
      {
        id: 'chase_it',
        label: 'Chase the inspiration',
        description: '+200 XP, -100 cash (coffee budget)',
        effects: { experience: 200, cash: -100 },
        outcome_text: 'The melody turns into a hook. You\'re onto something.',
      },
      {
        id: 'sleep_on_it',
        label: 'Sleep on it',
        description: '+50 XP, +1 rep (well-rested, you\'re charming today)',
        effects: { experience: 50, reputation: 1 },
        outcome_text: 'You forget the melody by morning. But you feel great.',
      },
    ],
  },
  {
    id: 'event_rival_idol',
    name: 'Rival Idol',
    description:
      'A rival idol just dropped a diss track aimed at you. Your fans are rattling for a response.',
    icon: '⚔️',
    tint: 'purple',
    choices: [
      {
        id: 'clap_back',
        label: 'Clap back with a diss track',
        description: '+1,200 fans, -2 rep (feuds sell but they\'re messy)',
        effects: { fans: 1200, reputation: -2 },
        outcome_text: 'The response track goes hard. Twitter is divided but buzzing.',
      },
      {
        id: 'take_high_road',
        label: 'Take the high road',
        description: '+400 fans, +3 rep (class wins respect)',
        effects: { fans: 400, reputation: 3 },
        outcome_text: 'You wish them well in an interview. The industry notices.',
      },
    ],
  },
  {
    id: 'event_fan_mail',
    name: 'Touching Fan Mail',
    description:
      'A long-time fan sent you a heartfelt letter about how your music changed their life. Your manager thinks it\'d make a great post.',
    icon: '💌',
    tint: 'pink',
    choices: [
      {
        id: 'share_publicly',
        label: 'Share it publicly',
        description: '+900 fans, +1 rep (authenticity resonates)',
        effects: { fans: 900, reputation: 1 },
        outcome_text: 'The post goes viral for all the right reasons.',
      },
      {
        id: 'keep_private',
        label: 'Keep it private',
        description: '+2 rep (you value the connection over the clout)',
        effects: { reputation: 2 },
        outcome_text: 'You write back personally. They never forget it.',
      },
    ],
  },
  {
    id: 'event_trend_forecast',
    name: 'Trend Forecast',
    description:
      'A trusted industry insider tips you off: the next big trend will be a genre you don\'t usually work in. You could pivot early.',
    icon: '📈',
    tint: 'teal',
    choices: [
      {
        id: 'pivot_early',
        label: 'Pivot early',
        description: '+500 fans, +300 XP (you\'re learning a new style)',
        effects: { fans: 500, experience: 300 },
        outcome_text: 'You start practicing the new genre. It feels foreign, but fresh.',
      },
      {
        id: 'stay_course',
        label: 'Stay in your lane',
        description: '+200 fans, +1 rep (consistency has value)',
        effects: { fans: 200, reputation: 1 },
        outcome_text: 'You double down on what you know. The forecast may be wrong.',
      },
    ],
  },
  {
    id: 'event_industry_gossip',
    name: 'Industry Gossip',
    description:
      'At an afterparty, you overhear two label execs talking about a merger that could reshape the market. This info is valuable.',
    icon: '🤫',
    tint: 'amber',
    choices: [
      {
        id: 'leverage_info',
        label: 'Leverage the info',
        description: '+2,000 cash (you make moves before the news breaks)',
        effects: { cash: 2000 },
        outcome_text: 'You quietly position yourself. The merger drops, you\'re ready.',
      },
      {
        id: 'stay_out_of_it',
        label: 'Stay out of it',
        description: '+2 rep (you\'re known for discretion)',
        effects: { reputation: 2 },
        outcome_text: 'You keep the secret. Both execs remember your silence.',
      },
    ],
  },
];

export function getEventDef(id: string): EventDefinition | undefined {
  return EVENTS.find((e) => e.id === id);
}

// ---------------------------------------------------------------------------
// Achievements — 13 long-term goals with pure unlock predicates.
// Per the brief §3.E and §8. The hook calls checkAchievements after every
// commit and queues a toast for newly-unlocked ones.
// ---------------------------------------------------------------------------

import type { AchievementDefinition } from './types';

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'ach_first_click',
    name: 'First Steps',
    description: 'Perform your very first click.',
    icon: '👣',
    check: (s) => s.stats.total_clicks >= 1,
  },
  {
    id: 'ach_1k_fans',
    name: 'Going Viral',
    description: 'Reach 1,000 fans.',
    icon: '🌟',
    progress_fn: (s) => ({ current: Math.min(s.resources.fans, 1000), target: 1000 }),
    check: (s) => s.resources.fans >= 1000,
  },
  {
    id: 'ach_10k_fans',
    name: 'Local Legend',
    description: 'Reach 10,000 fans.',
    icon: '⭐',
    progress_fn: (s) => ({ current: Math.min(s.resources.fans, 10000), target: 10000 }),
    check: (s) => s.resources.fans >= 10000,
  },
  {
    id: 'ach_100k_fans',
    name: 'Superstar',
    description: 'Reach 100,000 fans.',
    icon: '🏆',
    progress_fn: (s) => ({ current: Math.min(s.resources.fans, 100000), target: 100000 }),
    check: (s) => s.resources.fans >= 100000,
  },
  {
    id: 'ach_debut_song',
    name: 'Debut Release',
    description: 'Release your first song.',
    icon: '🎵',
    check: (s) => s.released_songs.length >= 1,
  },
  {
    id: 'ach_5_songs',
    name: 'Prolific',
    description: 'Release 5 songs total.',
    icon: '🎶',
    progress_fn: (s) => ({ current: Math.min(s.released_songs.length, 5), target: 5 }),
    check: (s) => s.released_songs.length >= 5,
  },
  {
    id: 'ach_first_hire',
    name: 'First Hire',
    description: 'Hire your first staff member.',
    icon: '🤝',
    check: (s) => Object.values(s.staff).some((n) => n > 0),
  },
  {
    id: 'ach_combo_20',
    name: 'On Fire',
    description: 'Reach a 20× click combo.',
    icon: '🔥',
    progress_fn: (s) => ({ current: Math.min(s.stats.max_combo_achieved, 20), target: 20 }),
    check: (s) => s.stats.max_combo_achieved >= 20,
  },
  {
    id: 'ach_small_club',
    name: 'Moving Up',
    description: 'Unlock the Small Club venue.',
    icon: '🎪',
    check: (s) => s.unlocked_venues.includes('venue_small_club'),
  },
  {
    id: 'ach_theater',
    name: 'Big Stage',
    description: 'Unlock the Theater venue.',
    icon: '🎭',
    check: (s) => s.unlocked_venues.includes('venue_theater'),
  },
  {
    id: 'ach_stadium',
    name: 'Stadium Filler',
    description: 'Unlock the Stadium venue.',
    icon: '🏟️',
    check: (s) => s.unlocked_venues.includes('venue_stadium'),
  },
  {
    id: 'ach_5_events',
    name: 'Decision Maker',
    description: 'Resolve 5 events.',
    icon: '📋',
    progress_fn: (s) => ({ current: Math.min(s.stats.total_events_resolved, 5), target: 5 }),
    check: (s) => s.stats.total_events_resolved >= 5,
  },
  {
    id: 'ach_rich',
    name: 'Money Moves',
    description: 'Accumulate 10,000 cash at once.',
    icon: '💰',
    progress_fn: (s) => ({ current: Math.min(s.resources.cash, 10000), target: 10000 }),
    check: (s) => s.resources.cash >= 10000,
  },
  {
    id: 'ach_combo_master',
    name: 'Combo Master',
    description: 'Reach a 50× click combo (the max).',
    icon: '⚡',
    progress_fn: (s) => ({ current: Math.min(s.stats.max_combo_achieved, 50), target: 50 }),
    check: (s) => s.stats.max_combo_achieved >= 50,
  },
  {
    id: 'ach_venue_explorer',
    name: 'Venue Explorer',
    description: 'Unlock 2 venues beyond the Local Bar.',
    icon: '🗺️',
    progress_fn: (s) => ({ current: Math.min(s.unlocked_venues.length - 1, 2), target: 2 }),
    check: (s) => s.unlocked_venues.length >= 3,
  },
];

export function getAchievementDef(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
