'use client';

/**
 * EventModal — presents an active timed event with its narrative description
 * and 2-3 choices. Each choice shows its effects (resource deltas) with
 * color-coded +/- icons. A countdown ring shows time remaining before the
 * event auto-dismisses.
 *
 * Per the brief §4 "Controversy and scandals", "Rival idols": events add
 * risk/reward decisions beyond purchasing upgrades.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Heart, DollarSign, Star, Zap } from 'lucide-react';
import type { ActiveEvent, EventChoice } from '@/lib/game/types';
import { formatDuration } from '@/lib/game/format';
import { cn } from '@/lib/utils';

interface EventModalProps {
  event: ActiveEvent | null;
  onResolve: (choiceId: string) => void;
}

const TINT_BG: Record<ActiveEvent['tint'], string> = {
  pink: 'border-pink-500/50 bg-card',
  amber: 'border-amber-500/50 bg-card',
  teal: 'border-teal-500/50 bg-card',
  purple: 'border-purple-500/50 bg-card',
};

const TINT_ACCENT: Record<ActiveEvent['tint'], string> = {
  pink: 'text-pink-600 dark:text-pink-300',
  amber: 'text-amber-600 dark:text-amber-300',
  teal: 'text-teal-600 dark:text-teal-300',
  purple: 'text-purple-600 dark:text-purple-300',
};

export function EventModal({ event, onResolve }: EventModalProps) {
  // Live countdown — recompute every 200ms so the bar drains smoothly.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!event) return;
    const id = window.setInterval(() => forceTick((n) => n + 1), 200);
    return () => window.clearInterval(id);
  }, [event]);

  const isOpen = event !== null;
  const remainingMs = event ? Math.max(0, event.expires_at - Date.now()) : 0;
  const totalMs = 60_000; // EVENT_DURATION_MS
  const remainingPct = event ? (remainingMs / totalMs) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={() => { /* prevent close-click dismiss; must pick a choice */ }}>
      <DialogContent
        className={cn(
          'max-w-md border-2 p-0',
          event && TINT_BG[event.tint],
        )}
        showCloseButton={false}
      >
        {event && (
          <>
            {/* Countdown bar */}
            <div className="px-6 pt-4">
              <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Time remaining</span>
                <span className={cn('font-mono font-bold', TINT_ACCENT[event.tint])}>
                  {formatDuration(remainingMs)}
                </span>
              </div>
              <Progress value={remainingPct} className={cn('h-1.5', progressTint(event.tint))} />
            </div>

            <DialogHeader className="px-6 pt-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden>{event.icon}</span>
                <div>
                  <DialogTitle className={cn('text-lg font-bold', TINT_ACCENT[event.tint])}>
                    {event.name}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] uppercase tracking-wider">
                    An opportunity has arisen
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="px-6 py-2">
              <p className="text-sm leading-relaxed text-foreground/80">
                {event.description}
              </p>
            </div>

            <DialogFooter className="flex-col gap-2 px-6 pb-6 sm:flex-col">
              {event.choices.map((choice) => (
                <ChoiceButton
                  key={choice.id}
                  choice={choice}
                  tint={event.tint}
                  onPick={() => onResolve(choice.id)}
                />
              ))}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChoiceButton({
  choice,
  tint,
  onPick,
}: {
  choice: EventChoice;
  tint: ActiveEvent['tint'];
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'group w-full rounded-lg border-2 p-3 text-left transition-all hover:scale-[1.01] hover:shadow-md active:scale-[0.99]',
        'border-border/60 bg-background/70',
        tint === 'pink' && 'hover:border-pink-500/60',
        tint === 'amber' && 'hover:border-amber-500/60',
        tint === 'teal' && 'hover:border-teal-500/60',
        tint === 'purple' && 'hover:border-purple-500/60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold text-foreground">{choice.label}</span>
        <EffectsPreview effects={choice.effects} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{choice.description}</p>
    </button>
  );
}

function EffectsPreview({ effects }: { effects: EventChoice['effects'] }) {
  const chips: { kind: 'fans' | 'cash' | 'rep' | 'xp'; value: number }[] = [];
  if (typeof effects.fans === 'number' && effects.fans !== 0)
    chips.push({ kind: 'fans', value: effects.fans });
  if (typeof effects.cash === 'number' && effects.cash !== 0)
    chips.push({ kind: 'cash', value: effects.cash });
  if (typeof effects.fame === 'number' && effects.fame !== 0)
    chips.push({ kind: 'rep', value: effects.fame });
  if (typeof effects.experience === 'number' && effects.experience !== 0)
    chips.push({ kind: 'xp', value: effects.experience });

  if (chips.length === 0) {
    return <span className="text-[10px] text-muted-foreground">no effect</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip) => {
        const isPos = chip.value > 0;
        const Icon = ICON_MAP[chip.kind];
        const tint = isPos
          ? chip.kind === 'fans'
            ? 'bg-pink-500/15 text-pink-600 dark:text-pink-300'
            : chip.kind === 'cash'
            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300'
            : chip.kind === 'rep'
            ? 'bg-teal-500/15 text-teal-600 dark:text-teal-300'
            : 'bg-purple-500/15 text-purple-600 dark:text-purple-300'
          : 'bg-destructive/10 text-destructive';
        return (
          <span
            key={chip.kind}
            className={cn(
              'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold',
              tint,
            )}
          >
            <Icon className="h-2.5 w-2.5" />
            {isPos ? '+' : ''}{chip.value}
          </span>
        );
      })}
    </div>
  );
}

const ICON_MAP = {
  fans: Heart,
  cash: DollarSign,
  rep: Star,
  xp: Zap,
} as const;

function progressTint(tint: ActiveEvent['tint']): string {
  switch (tint) {
    case 'pink': return '[&>div]:bg-pink-500';
    case 'amber': return '[&>div]:bg-amber-500';
    case 'teal': return '[&>div]:bg-teal-500';
    case 'purple': return '[&>div]:bg-purple-500';
  }
}
