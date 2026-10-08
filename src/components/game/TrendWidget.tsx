'use client';

/**
 * TrendWidget — shows the active musical trend with its lifecycle phase,
 * production multiplier, time-remaining progress bar, and the next-up genre.
 *
 * Per the brief §3.C / §4 "Trends and market dynamics": genres rise and
 * fall; early adopters get outsized returns, late followers get punished.
 * This widget surfaces the live trend so the player can plan song releases.
 */

import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TrendingUp, Sparkles, Flame, TrendingDown } from 'lucide-react';
import type { TrendPhase, TrendSnapshot } from '@/lib/game/types';
import { formatDuration } from '@/lib/game/format';
import { cn } from '@/lib/utils';

interface TrendWidgetProps {
  trend: TrendSnapshot;
}

const PHASE_CONFIG: Record<
  TrendPhase,
  { icon: typeof TrendingUp; tint: string; bg: string; ring: string; label: string }
> = {
  emerging: {
    icon: Sparkles,
    tint: 'text-purple-600 dark:text-purple-300',
    bg: 'bg-purple-500/10',
    ring: 'ring-purple-500/30',
    label: 'Emerging',
  },
  growing: {
    icon: TrendingUp,
    tint: 'text-teal-600 dark:text-teal-300',
    bg: 'bg-teal-500/10',
    ring: 'ring-teal-500/30',
    label: 'Growing',
  },
  mainstream: {
    icon: Flame,
    tint: 'text-pink-600 dark:text-pink-300',
    bg: 'bg-pink-500/10',
    ring: 'ring-pink-500/30',
    label: 'Mainstream',
  },
  declining: {
    icon: TrendingDown,
    tint: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
    ring: 'ring-amber-500/30',
    label: 'Declining',
  },
};

export function TrendWidget({ trend }: TrendWidgetProps) {
  const config = PHASE_CONFIG[trend.phase];
  const PhaseIcon = config.icon;

  // Time remaining in this trend rotation.
  const remainingMs = useMemo(
    () => Math.max(0, trend.ends_at - Date.now()),
    [trend.ends_at],
  );

  // Multiplier formatted: ×1.6, ×2.0, ×0.75
  const multLabel = `×${trend.multiplier.toFixed(2)}`;
  const isBoost = trend.multiplier >= 1;
  const isPenalty = trend.multiplier < 1;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card/80 p-3 shadow-sm ring-1 transition-all',
        config.ring,
      )}
      aria-label={`Current trend: ${trend.genre}, ${config.label} phase, ${multLabel} song production`}
    >
      {/* Background gradient sweep — rotates hue with phase */}
      <div
        className={cn('pointer-events-none absolute inset-0 -z-10 opacity-40', config.bg)}
        aria-hidden
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Trend
          </span>
          <Badge variant="secondary" className="text-[10px] font-bold">
            {trend.cycle_index + 1}/{trend.cycle_length}
          </Badge>
        </div>
        <div className={cn('flex items-center gap-1 text-[11px] font-bold', config.tint)}>
          <PhaseIcon className="h-3.5 w-3.5" />
          {config.label}
        </div>
      </div>

      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-lg font-bold tracking-tight text-foreground">{trend.genre}</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(
                  'cursor-help font-mono text-base font-bold tabular-nums',
                  isBoost && 'text-teal-600 dark:text-teal-300',
                  isPenalty && 'text-amber-600 dark:text-amber-400',
                )}
              >
                {multLabel}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px]">
              <p className="text-[11px]">
                Songs in the <strong>{trend.genre}</strong> genre currently produce{' '}
                <strong>{(trend.multiplier * 100).toFixed(0)}%</strong> of their base fan output.
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Phase multipliers — Emerging ×1.25, Growing ×1.6, Mainstream ×2.0, Declining ×0.75.
                Release in the matching genre during Mainstream for the biggest boost.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Lifecycle progress — colored by phase, shows where we are in the rotation */}
      <div className="mt-2">
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Lifecycle</span>
          <span>{formatDuration(remainingMs)} left</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          {/* Phase boundary tick marks (20%, 50%, 80%) */}
          <span className="absolute inset-y-0 left-[20%] w-px bg-foreground/15" aria-hidden />
          <span className="absolute inset-y-0 left-[50%] w-px bg-foreground/15" aria-hidden />
          <span className="absolute inset-y-0 left-[80%] w-px bg-foreground/15" aria-hidden />
          <Progress
            value={trend.progress * 100}
            className={cn('h-2 bg-transparent', phaseProgressBarClass(trend.phase))}
          />
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
          <span>Emerging</span>
          <span>Growing</span>
          <span>Mainstream</span>
          <span>Decline</span>
        </div>
      </div>
    </div>
  );
}

function phaseProgressBarClass(phase: TrendPhase): string {
  switch (phase) {
    case 'emerging':
      return '[&>div]:bg-purple-500';
    case 'growing':
      return '[&>div]:bg-teal-500';
    case 'mainstream':
      return '[&>div]:bg-pink-500';
    case 'declining':
      return '[&>div]:bg-amber-500';
  }
}
