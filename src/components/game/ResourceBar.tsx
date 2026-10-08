'use client';

/**
 * ResourceBar — sticky top header showing the 4 core resources (Fans, Cash,
 * Reputation, XP), each with an icon, current value, and a passive-rate
 * per-second tooltip / subtitle. Also includes the game title, era badge,
 * and an Achievements trophy button. Mobile: 2x2 grid; desktop: 4 across.
 */

import { Trophy, Settings2, BarChart3 } from 'lucide-react';
import { GameIcon } from './icons';
import { formatNumber, formatRate } from '@/lib/game/format';
import type { AchievementDefinition, GameState } from '@/lib/game/types';
import {
  staffProductionRate,
  songProductionRate,
} from '@/lib/game/engine';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ResourceBarProps {
  state: GameState;
  achievements: AchievementDefinition[];
  unlockedCount: number;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
}

export function ResourceBar({ state, achievements, unlockedCount, onOpenAchievements, onOpenSettings, onOpenStats }: ResourceBarProps) {
  const staffRate = staffProductionRate(state);
  const songRate = songProductionRate(state);
  // Fans come from staff + active songs (passive only).
  const fansPerSec = staffRate.fans + songRate;
  const cashPerSec = staffRate.cash;
  const repPerSec = staffRate.reputation;
  // XP has no passive source in M2; it accrues only via clicks. Show 0/s.
  const xpPerSec = 0;

  const items = [
    {
      kind: 'fans' as const,
      label: 'Fans',
      value: state.resources.fans,
      rate: fansPerSec,
      tint: 'text-pink-600 dark:text-pink-300',
    },
    {
      kind: 'cash' as const,
      label: 'Cash',
      value: state.resources.cash,
      rate: cashPerSec,
      tint: 'text-amber-600 dark:text-amber-300',
    },
    {
      kind: 'rep' as const,
      label: 'Rep',
      value: state.resources.reputation,
      rate: repPerSec,
      tint: 'text-teal-600 dark:text-teal-300',
    },
    {
      kind: 'xp' as const,
      label: 'XP',
      value: state.resources.experience,
      rate: xpPerSec,
      tint: 'text-purple-600 dark:text-purple-300',
    },
  ];

  return (
    <header
      className="sticky top-0 z-30 border-b border-border/80 bg-card/80 backdrop-blur-md supports-[backdrop-filter]:bg-card/60"
      aria-label="Resource bar"
    >
      <div className="mx-auto flex h-auto max-w-7xl flex-col gap-2 px-3 py-2 sm:px-4 sm:py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-bold tracking-tight text-primary sm:text-lg">
            Idol<span className="text-foreground/60">Idle</span>
          </span>
          <span className="hidden rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground sm:inline">
            M2 · Era I
          </span>
          {/* Achievements trophy button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenAchievements}
            className="ml-1 h-7 gap-1 border-primary/40 px-2 hover:border-primary/60"
            aria-label={`Achievements: ${unlockedCount} of ${achievements.length} unlocked`}
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-mono text-[10px] font-bold tabular-nums">
              {unlockedCount}/{achievements.length}
            </span>
          </Button>
          {/* Settings gear button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenSettings}
            className="h-7 w-7 border-primary/40 p-0 hover:border-primary/60"
            aria-label="Open settings"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          {/* Stats chart button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenStats}
            className="h-7 w-7 border-primary/40 p-0 hover:border-primary/60"
            aria-label="View career stats"
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 md:flex md:gap-4">
          {items.map((it) => (
            <div
              key={it.kind}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 shadow-sm sm:px-3 sm:py-2"
            >
              <GameIcon kind={it.kind} size={24} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-sm font-bold tabular-nums sm:text-base">
                    {formatNumber(it.value)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn('text-[11px] font-bold tabular-nums sm:text-xs', it.tint)}>
                    {it.rate > 0 ? `+${formatRate(it.rate)}` : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
