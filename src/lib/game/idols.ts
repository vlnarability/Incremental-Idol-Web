/**
 * Idol Incremental — Idol Archetypes
 *
 * 8 playable character types (4 female, 4 male) with distinct visual styles,
 * starting stat biases, and flavor text. The chosen archetype persists
 * across the entire save — it's the player's character forever.
 *
 * In the Manager era (Era II), these archetypes also appear as possible
 * recruits, but the player's chosen one does not reappear.
 */

/** The 5 trainable/global stats that define an idol. */
export interface IdolStats {
  /** Affects song quality and performance output. */
  vocals: number;
  /** Affects click value and combo multiplier. */
  dance: number;
  /** Affects fan conversion rate (how efficiently fans are gained). */
  charisma: number;
  /** Affects fame gain rate. */
  charm: number;
  /**
   * Global multiplier on ALL gains (fans, cash, fame, XP). Only increases
   * through performing — not buyable. This is the idol's "star power" that
   * grows over their career. Persisted across sessions.
   */
  star_factor: number;
}

/** A playable character archetype with starting stat biases. */
export interface IdolArchetype {
  /** Stable id, e.g. 'cute_female'. */
  id: string;
  /** Display name, e.g. 'The Cute One'. */
  name: string;
  /** One-line tagline. */
  tagline: string;
  /** Longer description for the selection screen. */
  description: string;
  /** Gender — used for grouping in the selection UI. */
  gender: 'female' | 'male';
  /** Emoji icon for compact display. */
  icon: string;
  /** Path to the pixel-art portrait in /public/game/idols/. */
  portrait: string;
  /** Starting stat values (before any upgrades). Base = 10 for all stats
   * unless overridden here. STAR FACTOR always starts at 1.0. */
  starting_stats: Partial<IdolStats>;
  /** Themed tint for the selection card. */
  tint: 'pink' | 'amber' | 'teal' | 'purple';
}

/** Default starting stats — all 10, STAR FACTOR 1.0. Same for every archetype. */
export const DEFAULT_STARTING_STATS: IdolStats = {
  vocals: 10,
  dance: 10,
  charisma: 10,
  charm: 10,
  star_factor: 1.0,
};

export const ARCHETYPES: IdolArchetype[] = [
  // ---- Female ----
  {
    id: 'cute_female',
    name: 'The Cute One',
    tagline: 'Ultra-girly, adorable, and impossible to resist.',
    description: 'The ultra-girly member who excels at high-pitched vocals, winking, and exaggerated cute gestures. Fans fall in love instantly.',
    gender: 'female',
    icon: '🎀',
    portrait: '/game/idols/idol-cute-female.png',
    starting_stats: {}, // Purely visual — no stat differences
    tint: 'pink',
  },
  {
    id: 'girlcrush_female',
    name: 'The Girl Crush',
    tagline: 'Cool, confident, and edgy. Female fans adore her.',
    description: 'The cool, confident tomboy with sharper features and less traditional styling. Hugely popular among female fans for her swagger.',
    gender: 'female',
    icon: '⚡',
    portrait: '/game/idols/idol-girlcrush-female.png',
    starting_stats: {},
    tint: 'purple',
  },
  {
    id: 'innocent_female',
    name: 'The Innocent Type',
    tagline: 'Ethereal, elegant, and pure. The classic first-love vibe.',
    description: 'The classic, ethereal beauty who embodies traditional elegance. Kept away from rebellious concepts — her purity is her brand.',
    gender: 'female',
    icon: '🌸',
    portrait: '/game/idols/idol-innocent-female.png',
    starting_stats: {},
    tint: 'teal',
  },
  {
    id: 'sunshine_female',
    name: 'The Sunshine',
    tagline: 'Loud, goofy, and the life of every party.',
    description: 'The chaotic, loud, and incredibly funny member who breaks the "perfect idol" mold. Making goofy faces and pulling pranks is her specialty.',
    gender: 'female',
    icon: '☀️',
    portrait: '/game/idols/idol-sunshine-female.png',
    starting_stats: {},
    tint: 'amber',
  },
  // ---- Male ----
  {
    id: 'tough_male',
    name: 'The Tough One',
    tagline: 'Beast-like intensity. Dark concepts and raw power.',
    description: 'The masculine, muscular idol with dark concepts, a deep voice, and intense high-energy choreography. The "beast" of the group.',
    gender: 'male',
    icon: '🔥',
    portrait: '/game/idols/idol-tough-male.png',
    starting_stats: {},
    tint: 'purple',
  },
  {
    id: 'prettyboy_male',
    name: 'The Pretty Boy',
    tagline: 'Delicate, princely, and impossibly beautiful.',
    description: 'The flower boy with incredibly delicate, beautiful features and a sweet, princely image. Appeals to fans looking for a gentle romantic fantasy.',
    gender: 'male',
    icon: '💎',
    portrait: '/game/idols/idol-prettyboy-male.png',
    starting_stats: {},
    tint: 'pink',
  },
  {
    id: 'cool_male',
    name: 'The Cool Intellectual',
    tagline: 'Tall, quiet, and mysteriously alluring.',
    description: 'The tall, quiet, slightly mysterious member who rarely speaks in interviews. His cold aura makes every rare smile feel like a gift.',
    gender: 'male',
    icon: '🧊',
    portrait: '/game/idols/idol-cool-male.png',
    starting_stats: {},
    tint: 'teal',
  },
  {
    id: 'adorkable_male',
    name: 'The Adorkable',
    tagline: 'Clumsy, goofy, and babied by everyone.',
    description: 'The member who is constantly clumsy and babied by fans. Even if he\'s the oldest, he acts like the youngest through pure, accidental cuteness.',
    gender: 'male',
    icon: '🤓',
    portrait: '/game/idols/idol-adorkable-male.png',
    starting_stats: {},
    tint: 'amber',
  },
];

export function getArchetype(id: string): IdolArchetype | undefined {
  return ARCHETYPES.find((a) => a.id === id);
}

/** Compute starting stats for a given archetype (merging defaults with overrides). */
export function getStartingStats(archetypeId: string): IdolStats {
  const def = getArchetype(archetypeId);
  return {
    ...DEFAULT_STARTING_STATS,
    ...(def?.starting_stats ?? {}),
    star_factor: 1.0, // STAR FACTOR always starts at 1.0
  };
}
