'use client';

/**
 * StatPanel — shows the idol's 5 stats (Vocals, Dance, Charisma, Charm,
 * STAR FACTOR) with current values + the STAR FACTOR multiplier. Also
 * includes 4 Train buttons (one per trainable stat).
 *
 * Placed below the click stage so it's always visible alongside the
 * Perform button.
 */

import { Mic, Music, Heart, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { starFactorMultiplier } from '@/lib/game/engine';
import type { GameState } from '@/lib/game/types';
import { cn } from '@/lib/utils';

interface StatPanelProps {
  state: GameState;
  onTrain: (stat: 'vocals' | 'dance' | 'charisma' | 'charm') => void;
}

const STAT_CONFIG = [
  { key: 'vocals' as const, label: 'Vocals', icon: Mic, tint: 'text-purple-600 dark:text-purple-300', barColor: '[&>div]:bg-purple-500' },
  { key: 'dance' as const, label: 'Dance', icon: Music, tint: 'text-pink-600 dark:text-pink-300', barColor: '[&>div]:bg-pink-500' },
  { key: 'charisma' as const, label: 'Charisma', icon: Heart, tint: 'text-teal-600 dark:text-teal-300', barColor: '[&>div]:bg-teal-500' },
  { key: 'charm' as const, label: 'Charm', icon: Star, tint: 'text-amber-600 dark:text-amber-300', barColor: '[&>div]:bg-amber-500' },
];

// Max stat for the progress bar (visual only — stats can exceed this)
const STAT_BAR_MAX = 50;

export function StatPanel({ state, onTrain }: StatPanelProps) {
  const { idol_stats } = state;
  const starMult = starFactorMultiplier(state);

  return (
    <div className="w-full max-w-md rounded-xl border border-border/60 bg-card/70 p-3">
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
    </div>
  );
}
