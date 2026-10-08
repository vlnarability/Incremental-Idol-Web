'use client';

/**
 * StatsModal — lifetime career stats modal accessible via a chart icon in
 * the ResourceBar. Shows: total clicks, max combo, songs released (lifetime),
 * events resolved (lifetime), venues unlocked, time played, achievements
 * unlocked, and current resource snapshot.
 *
 * Per the brief §9 "Balance metrics": "Track these values during internal
 * playtests: Time to first upgrade, first gig, and first automated income
 * source..." A player-facing stats panel is the natural extension.
 */

import { BarChart3, Clock, MousePointer, Flame, Music, Bell, Building2, Trophy, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ACHIEVEMENTS, VENUES } from '@/lib/game/engine';
import { formatNumber, formatDuration } from '@/lib/game/format';
import type { GameState } from '@/lib/game/types';
import { cn } from '@/lib/utils';

interface StatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: GameState;
}

export function StatsModal({ open, onOpenChange, state }: StatsModalProps) {
  const { stats, resources, unlocked_venues, unlocked_achievements, released_songs, event_log } = state;
  const sessionMs = Date.now() - stats.started_at;
  const venuesUnlocked = unlocked_venues.length - 1; // exclude starting Local Bar
  const achievementsUnlocked = unlocked_achievements.length;
  const totalAchievements = ACHIEVEMENTS.length;

  const statRows: { icon: typeof Clock; label: string; value: string; tint: string }[] = [
    {
      icon: MousePointer,
      label: 'Total Clicks',
      value: formatNumber(stats.total_clicks),
      tint: 'text-pink-600 dark:text-pink-300',
    },
    {
      icon: Flame,
      label: 'Best Combo',
      value: stats.max_combo_achieved > 0 ? `${stats.max_combo_achieved}×` : '—',
      tint: 'text-teal-600 dark:text-teal-300',
    },
    {
      icon: Music,
      label: 'Songs Released',
      value: formatNumber(stats.total_songs_released),
      tint: 'text-purple-600 dark:text-purple-300',
    },
    {
      icon: Bell,
      label: 'Events Resolved',
      value: formatNumber(stats.total_events_resolved),
      tint: 'text-amber-600 dark:text-amber-300',
    },
    {
      icon: Building2,
      label: 'Venues Unlocked',
      value: `${venuesUnlocked} / ${VENUES.length - 1}`,
      tint: 'text-teal-600 dark:text-teal-300',
    },
    {
      icon: Trophy,
      label: 'Achievements',
      value: `${achievementsUnlocked} / ${totalAchievements}`,
      tint: 'text-amber-600 dark:text-amber-300',
    },
    {
      icon: Calendar,
      label: 'Time Played',
      value: formatDuration(sessionMs),
      tint: 'text-foreground',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-2 border-primary/40 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-primary">
            <BarChart3 className="h-5 w-5" />
            Career Stats
          </DialogTitle>
          <DialogDescription>
            Your lifetime performance metrics across this save.
          </DialogDescription>
        </DialogHeader>

        {/* Stat rows grid */}
        <div className="grid grid-cols-2 gap-2 py-2">
          {statRows.map((row) => {
            const Icon = row.icon;
            return (
              <div
                key={row.label}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 p-2"
              >
                <Icon className={cn('h-4 w-4 shrink-0', row.tint)} />
                <div className="min-w-0">
                  <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {row.label}
                  </div>
                  <div className={cn('font-mono text-sm font-bold tabular-nums', row.tint)}>
                    {row.value}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Current resources snapshot */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current Resources
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <ResourceLine label="Fans" value={resources.fans} tint="text-pink-600 dark:text-pink-300" />
            <ResourceLine label="Cash" value={resources.cash} tint="text-amber-600 dark:text-amber-300" />
            <ResourceLine label="Rep" value={resources.reputation} tint="text-teal-600 dark:text-teal-300" />
            <ResourceLine label="XP" value={resources.experience} tint="text-purple-600 dark:text-purple-300" />
          </div>
        </div>

        {/* Active songs + recent events counts */}
        <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 p-2 text-[10px]">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Music className="h-3 w-3" />
            Active songs: <span className="font-bold text-foreground">{released_songs.length}</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Bell className="h-3 w-3" />
            Recent events: <span className="font-bold text-foreground">{event_log.length}</span>
          </span>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResourceLine({ label, value, tint }: { label: string; value: number; tint: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-mono font-bold tabular-nums', tint)}>{formatNumber(value)}</span>
    </div>
  );
}

/** Chart icon button for the ResourceBar. Renders the trigger + modal. */
export function StatsButton({ open, onOpenChange, state }: StatsModalProps) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onOpenChange(true)}
        className="h-7 w-7 border-primary/40 p-0 hover:border-primary/60"
        aria-label="View career stats"
      >
        <BarChart3 className="h-3.5 w-3.5" />
      </Button>
      <StatsModal open={open} onOpenChange={onOpenChange} state={state} />
    </>
  );
}
