'use client';

/**
 * StatPanel — shows the idol's 5 stats + energy bar + Free Time action buttons.
 *
 * Free Time actions (each costs 1 energy):
 * - Train (4 buttons, one per trainable stat)
 * - Social Gathering (gives fans/cash/fame based on stats)
 * - Go Out (guaranteed event, good or bad)
 *
 * End Week button: big payout, resets energy, increments week.
 *
 * Per the user's design: "You have X actions in a free time section. You can
 * do the Training for up to Y clicks, and then do X-Y Social Gatherings,
 * then (or just skip the spending of the energy currency) a big performance."
 */

import { Mic, Music, Heart, Star, Sparkles, Users, DoorOpen, Calendar, Clapperboard, Tv, Camera, MicVocal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { starFactorMultiplier, performanceQuality, SPECIAL_EVENT_THRESHOLDS, isSpecialEventUnlocked } from '@/lib/game/engine';
import type { GameState } from '@/lib/game/types';
import { cn } from '@/lib/utils';

interface StatPanelProps {
  state: GameState;
  onTrain: (stat: 'vocals' | 'dance' | 'charisma' | 'charm') => void;
  onSocial: () => void;
  onGoOut: () => void;
  onSpecialEvent: (kind: 'interview' | 'acting' | 'modeling' | 'tv_spot') => void;
  onEndWeek: () => void;
}

const STAT_CONFIG = [
  { key: 'vocals' as const, label: 'Vocals', icon: Mic, tint: 'text-purple-600 dark:text-purple-300', barColor: '[&>div]:bg-purple-500' },
  { key: 'dance' as const, label: 'Dance', icon: Music, tint: 'text-pink-600 dark:text-pink-300', barColor: '[&>div]:bg-pink-500' },
  { key: 'charisma' as const, label: 'Charisma', icon: Heart, tint: 'text-teal-600 dark:text-teal-300', barColor: '[&>div]:bg-teal-500' },
  { key: 'charm' as const, label: 'Charm', icon: Star, tint: 'text-amber-600 dark:text-amber-300', barColor: '[&>div]:bg-amber-500' },
];

const STAT_BAR_MAX = 50;

export function StatPanel({ state, onTrain, onSocial, onGoOut, onSpecialEvent, onEndWeek }: StatPanelProps) {
  const { idol_stats, energy, max_energy, week, resources } = state;
  const starMult = starFactorMultiplier(state);
  const quality = performanceQuality(state);
  const energyPct = (energy / max_energy) * 100;
  const hasEnergy = energy > 0;
  const fameVal = resources.fame;
  const isInfamy = fameVal < 0;

  return (
    <div className="w-full max-w-md rounded-xl border border-border/60 bg-card/70 p-3">
      {/* Week + Energy bar */}
      <div className="mb-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Week {week} · Free Time
          </span>
          <span className="font-mono text-[10px] font-bold text-primary">
            {energy}/{max_energy} energy
          </span>
        </div>
        <Progress value={energyPct} className="h-2 [&>div]:bg-primary" />
      </div>

      {/* Free Time action buttons */}
      <div className="mb-2 grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={!hasEnergy}
          onClick={onSocial}
          className="h-8 gap-1.5 text-[10px] font-bold uppercase tracking-wider"
        >
          <Users className="h-3.5 w-3.5 text-teal-500" />
          Social
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!hasEnergy}
          onClick={onGoOut}
          className="h-8 gap-1.5 text-[10px] font-bold uppercase tracking-wider"
        >
          <DoorOpen className="h-3.5 w-3.5 text-purple-500" />
          Go Out
        </Button>
      </div>

      {/* Special events — unlock at Fame thresholds */}
      <div className="mb-2">
        <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
          Opportunities {isInfamy ? '(Infamy)' : ''}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {([
            { kind: 'interview' as const, label: 'Interview', icon: MicVocal, threshold: SPECIAL_EVENT_THRESHOLDS.interview },
            { kind: 'acting' as const, label: 'Acting', icon: Clapperboard, threshold: SPECIAL_EVENT_THRESHOLDS.acting },
            { kind: 'modeling' as const, label: 'Modeling', icon: Camera, threshold: SPECIAL_EVENT_THRESHOLDS.modeling },
            { kind: 'tv_spot' as const, label: 'TV Spot', icon: Tv, threshold: SPECIAL_EVENT_THRESHOLDS.tv_spot },
          ]).map(({ kind, label, icon: Icon, threshold }) => {
            const unlocked = isSpecialEventUnlocked(state, kind);
            return (
              <Button
                key={kind}
                size="sm"
                variant={unlocked ? 'outline' : 'secondary'}
                disabled={!unlocked || !hasEnergy}
                onClick={() => onSpecialEvent(kind)}
                className={cn(
                  'h-7 gap-1 text-[9px] font-bold uppercase tracking-wider',
                  unlocked && 'hover:border-primary/60',
                )}
                aria-label={unlocked ? label : `${label} (locked — need ${threshold} fame)`}
              >
                <Icon className="h-3 w-3" />
                {unlocked ? label : `🔒 ${threshold}`}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Stats grid with Train buttons */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Idol Stats
        </span>
        {/* STAR FACTOR special display */}
        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-pink-500/20 px-2 py-0.5">
          <Sparkles className="h-3 w-3 text-amber-500" />
          <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-300">
            STAR ×{starMult.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {STAT_CONFIG.map(({ key, label, icon: Icon, tint, barColor }) => {
          const val = idol_stats[key];
          const pct = Math.min(100, (val / STAT_BAR_MAX) * 100);
          return (
            <div key={key} className="rounded-lg border border-border/40 bg-background/60 p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Icon className={cn('h-3 w-3', tint)} />
                  <span className="text-[10px] font-semibold">{label}</span>
                </div>
                <span className={cn('font-mono text-xs font-bold tabular-nums', tint)}>
                  {val.toFixed(1)}
                </span>
              </div>
              <Progress value={pct} className={cn('mt-1 h-1.5', barColor)} />
              <Button
                size="sm"
                variant="outline"
                disabled={!hasEnergy}
                onClick={() => onTrain(key)}
                className="mt-1.5 h-6 w-full text-[9px] font-bold uppercase tracking-wider"
              >
                Train {label}
              </Button>
            </div>
          );
        })}
      </div>

      {/* STAR FACTOR bar */}
      <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-amber-500" />
            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-300">
              STAR FACTOR
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-300">
            {idol_stats.star_factor.toFixed(3)}
          </span>
        </div>
        <Progress
          value={Math.min(100, (idol_stats.star_factor / 50) * 100)}
          className="mt-1 h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-pink-500"
        />
        <p className="mt-1 text-[9px] text-muted-foreground">
          Grows only by performing. Boosts ALL gains by ×{starMult.toFixed(2)}.
        </p>
      </div>

      {/* End Week button */}
      <Button
        size="lg"
        variant="default"
        onClick={onEndWeek}
        className="mt-3 h-11 w-full gap-2 font-mono text-sm font-bold uppercase tracking-wider"
      >
        <Calendar className="h-4 w-4" />
        End Week · Perform
      </Button>
      <p className="mt-1 text-center text-[9px] text-muted-foreground">
        Big payout based on stats + venue. Resets energy to {max_energy}.
      </p>
    </div>
  );
}
