'use client';

/**
 * ResourceBar — sticky top header showing the 4 core resources (Fans, Cash,
 * Fame, XP), each with an icon, current value, and a passive-rate
 * per-second tooltip / subtitle. Also includes the game title, era badge,
 * and an Achievements trophy button. Mobile: 2x2 grid; desktop: 4 across.
 */

import { Trophy, Settings2, BarChart3, History, Menu, Save } from 'lucide-react';
import { GameIcon } from './icons';
import { formatNumber, formatRate } from '@/lib/game/format';
import type { AchievementDefinition, GameState, Milestone } from '@/lib/game/types';
import {
  songProductionRate,
} from '@/lib/game/engine';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ResourceBarProps {
  state: GameState;
  achievements: AchievementDefinition[];
  unlockedCount: number;
  milestones: Milestone[];
  activeSlot: number;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  onOpenMilestones: () => void;
  onOpenSaveSlots: () => void;
}

export function ResourceBar({ state, achievements, unlockedCount, milestones, activeSlot, onOpenAchievements, onOpenSettings, onOpenStats, onOpenMilestones, onOpenSaveSlots }: ResourceBarProps) {
  const songRate = songProductionRate(state);
  // Songs produce all three core resources passively (fans, cash, fame),
  // each decaying exponentially since the song's release.
  const fansPerSec = songRate.fans;
  const cashPerSec = songRate.cash;
  const famePerSec = songRate.fame;
  // XP has no passive source in M2; it accrues only via clicks. Show 0/s.
  const xpPerSec = 0;

  const items = [
    {
      kind: 'fans' as const,
      label: 'Fans',
      value: state.resources.fans,
      rate: fansPerSec,
      tint: 'text-pink-600 dark:text-pink-300',
      // Fans are large integers — use compact format.
      formatVal: (v: number) => formatNumber(v),
    },
    {
      kind: 'cash' as const,
      label: 'Cash',
      value: state.resources.cash,
      rate: cashPerSec,
      tint: 'text-amber-600 dark:text-amber-300',
      formatVal: (v: number) => formatNumber(v),
    },
    {
      kind: 'rep' as const,
      label: state.resources.fame < 0 ? 'Infamy' : 'Fame',
      value: state.resources.fame,
      rate: famePerSec,
      tint: state.resources.fame < 0
        ? 'text-destructive'
        : 'text-teal-600 dark:text-teal-300',
      // Fame starts tiny (0.005/click) — show 1 decimal for values < 10,
      // compact for larger. This avoids the "+0" problem.
      formatVal: (v: number) => v < 0 ? v.toFixed(1) : (v < 10 ? v.toFixed(1) : formatNumber(v)),
    },
    {
      kind: 'xp' as const,
      label: 'XP',
      value: state.resources.experience,
      rate: xpPerSec,
      tint: 'text-purple-600 dark:text-purple-300',
      formatVal: (v: number) => formatNumber(v),
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

          {/* Mobile: dropdown menu grouping all 4 icon buttons */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ml-1 h-7 w-7 border-primary/40 p-0 sm:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Game Menu
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenAchievements} className="gap-2 text-xs">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                Achievements ({unlockedCount}/{achievements.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenStats} className="gap-2 text-xs">
                <BarChart3 className="h-3.5 w-3.5 text-teal-500" />
                Career Stats
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenMilestones} className="gap-2 text-xs">
                <History className="h-3.5 w-3.5 text-purple-500" />
                Timeline ({milestones.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenSaveSlots} className="gap-2 text-xs">
                <Save className="h-3.5 w-3.5" />
                Save Slots ({activeSlot}/3)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenSettings} className="gap-2 text-xs">
                <Settings2 className="h-3.5 w-3.5" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Desktop (sm+): inline icon buttons */}
          {/* Achievements trophy button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenAchievements}
            className="ml-1 hidden h-7 gap-1 border-primary/40 px-2 hover:border-primary/60 sm:inline-flex"
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
            className="hidden h-7 w-7 border-primary/40 p-0 hover:border-primary/60 sm:inline-flex"
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
            className="hidden h-7 w-7 border-primary/40 p-0 hover:border-primary/60 sm:inline-flex"
            aria-label="View career stats"
          >
            <BarChart3 className="h-3.5 w-3.5" />
          </Button>
          {/* Milestones history button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenMilestones}
            className="relative hidden h-7 w-7 border-primary/40 p-0 hover:border-primary/60 sm:inline-flex"
            aria-label={`View career timeline: ${milestones.length} milestones`}
          >
            <History className="h-3.5 w-3.5" />
            {milestones.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 font-mono text-[8px] font-bold text-primary-foreground">
                {milestones.length > 99 ? '99+' : milestones.length}
              </span>
            )}
          </Button>
          {/* Save slots button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenSaveSlots}
            className="relative hidden h-7 w-7 border-primary/40 p-0 hover:border-primary/60 sm:inline-flex"
            aria-label={`Save slots (active: ${activeSlot})`}
          >
            <Save className="h-3.5 w-3.5" />
            <span className="absolute -bottom-1 -right-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-secondary px-0.5 font-mono text-[8px] font-bold text-secondary-foreground">
              {activeSlot}
            </span>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 md:flex md:gap-4">
          {items.map((it) => (
            <div
              key={it.kind}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5 shadow-sm sm:px-3 sm:py-2"
            >
              <div className="flex flex-col items-center">
                <GameIcon kind={it.kind} size={24} />
                <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {it.label}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-sm font-bold tabular-nums sm:text-base">
                    {it.formatVal(it.value)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={cn('text-[11px] font-bold tabular-nums sm:text-xs', it.tint)}>
                    {it.rate > 0 ? `+${it.formatVal(it.rate)}/s` : '—'}
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
