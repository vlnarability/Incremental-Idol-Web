'use client';

/**
 * TrendWidget — compact display of the active musical trend.
 * Shows genre, phase icon, multiplier, and lifecycle progress in one tight row.
 */

import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
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
  emerging: { icon: Sparkles, tint: 'text-purple-600 dark:text-purple-300', bg: 'bg-purple-500/10', ring: 'ring-purple-500/20', label: 'Emerging' },
  growing: { icon: TrendingUp, tint: 'text-teal-600 dark:text-teal-300', bg: 'bg-teal-500/10', ring: 'ring-teal-500/20', label: 'Growing' },
  mainstream: { icon: Flame, tint: 'text-pink-600 dark:text-pink-300', bg: 'bg-pink-500/10', ring: 'ring-pink-500/20', label: 'Mainstream' },
  declining: { icon: TrendingDown, tint: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', ring: 'ring-amber-500/20', label: 'Declining' },
};

export function TrendWidget({ trend }: TrendWidgetProps) {
  const config = PHASE_CONFIG[trend.phase];
  const PhaseIcon = config.icon;
  const remainingMs = useMemo(() => Math.max(0, trend.ends_at - Date.now()), [trend.ends_at]);
  const multLabel = `×${trend.multiplier.toFixed(2)}`;
  const isBoost = trend.multiplier >= 1;
  const isPenalty = trend.multiplier < 1;

  return (
    <div
      className={cn('relative overflow-hidden rounded-lg border bg-card/80 px-3 py-2 ring-1 transition-all', config.ring)}
      aria-label={`Trend: ${trend.genre}, ${config.label}, ${multLabel}`}
    >
      <div className={cn('pointer-events-none absolute inset-0 -z-10 opacity-30', config.bg)} aria-hidden />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <PhaseIcon className={cn('h-3 w-3', config.tint)} />
          <span className="text-xs font-bold">{trend.genre}</span>
          <span className="text-[9px] text-muted-foreground">{config.label}</span>
        </div>
        <span className={cn('font-mono text-xs font-bold', isBoost && 'text-teal-600 dark:text-teal-300', isPenalty && 'text-amber-600 dark:text-amber-400')}>
          {multLabel}
        </span>
      </div>

      <div className="mt-1.5">
        <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
          <span className="absolute inset-y-0 left-[20%] w-px bg-foreground/10" aria-hidden />
          <span className="absolute inset-y-0 left-[50%] w-px bg-foreground/10" aria-hidden />
          <span className="absolute inset-y-0 left-[80%] w-px bg-foreground/10" aria-hidden />
          <Progress value={trend.progress * 100} className={cn('h-1 bg-transparent', phaseProgressBarClass(trend.phase))} />
        </div>
        <div className="mt-0.5 flex justify-between text-[7px] text-muted-foreground">
          <span>{formatDuration(remainingMs)} left</span>
          <span>{trend.cycle_index + 1}/{trend.cycle_length}</span>
        </div>
      </div>
    </div>
  );
}

function phaseProgressBarClass(phase: TrendPhase): string {
  switch (phase) {
    case 'emerging': return '[&>div]:bg-purple-500';
    case 'growing': return '[&>div]:bg-teal-500';
    case 'mainstream': return '[&>div]:bg-pink-500';
    case 'declining': return '[&>div]:bg-amber-500';
  }
}
