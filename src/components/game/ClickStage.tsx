'use client';

/**
 * ClickStage — the main click target. Idol portrait + big "Perform" button
 * + floating feedback text on each click + current venue display + fan
 * saturation progress bar (logistic).
 *
 * Clicks call `actions.click()` and use the returned ClickResult to spawn
 * a floating "+X" element that animates up and fades.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { IdolPortrait } from './icons';
import { formatNumber, formatDuration } from '@/lib/game/format';
import {
  addressableAudience,
  getVenueDef,
  staffProductionRate,
  songProductionRate,
} from '@/lib/game/engine';
import type { ClickResult, GameState } from '@/lib/game/types';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FloatingNumber {
  id: number;
  x: number; // px offset from container left
  y: number; // px offset from container top
  text: string;
  tone: 'pink' | 'amber' | 'teal' | 'purple';
}

interface ClickStageProps {
  state: GameState;
  onClick: () => ClickResult | null;
}

const TONES: Record<FloatingNumber['tone'], string> = {
  pink: 'text-pink-500 dark:text-pink-300',
  amber: 'text-amber-500 dark:text-amber-300',
  teal: 'text-teal-500 dark:text-teal-300',
  purple: 'text-purple-500 dark:text-purple-300',
};

export function ClickStage({ state, onClick }: ClickStageProps) {
  const [floaters, setFloaters] = useState<FloatingNumber[]>([]);
  const nextId = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);

  // Prune expired floaters so the array doesn't grow unbounded.
  useEffect(() => {
    if (floaters.length === 0) return;
    const t = window.setTimeout(() => {
      setFloaters((curr) => curr.filter((f) => Date.now() - f.id < 1300));
    }, 1300);
    return () => window.clearTimeout(t);
  }, [floaters]);

  const handlePerform = useCallback(() => {
    const result = onClick();
    if (!result) return;
    const stage = stageRef.current;
    if (!stage) return;
    // Random offset near center
    const rect = stage.getBoundingClientRect();
    const cx = rect.width / 2 + (Math.random() - 0.5) * 80;
    const cy = rect.height / 2 - 30 + (Math.random() - 0.5) * 40;
    const newOnes: FloatingNumber[] = [];
    if (result.fans_gained > 0)
      newOnes.push({ id: nextId.current++, x: cx - 30, y: cy, text: `+${formatNumber(result.fans_gained)} fans`, tone: 'pink' });
    if (result.cash_gained > 0)
      newOnes.push({ id: nextId.current++, x: cx + 10, y: cy + 20, text: `+${formatNumber(result.cash_gained)} cash`, tone: 'amber' });
    if (result.xp_gained > 0)
      newOnes.push({ id: nextId.current++, x: cx + 40, y: cy - 10, text: `+${formatNumber(result.xp_gained)} XP`, tone: 'purple' });
    if (newOnes.length > 0) setFloaters((curr) => [...curr, ...newOnes].slice(-24));
  }, [onClick]);

  // Keyboard: Space / Enter triggers perform
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handlePerform();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlePerform]);

  const venue = getVenueDef(state.current_venue_id);
  const audience = addressableAudience(state);
  const fans = state.resources.fans;
  const saturationPct = Math.min(100, Math.max(0, (fans / audience) * 100));

  const staffRate = staffProductionRate(state);
  const songRate = songProductionRate(state);
  const fansPerSec = staffRate.fans + songRate;
  const cashPerSec = staffRate.cash;
  const repPerSec = staffRate.reputation;

  const sessionMs = Date.now() - state.stats.started_at;

  return (
    <section
      ref={stageRef}
      className="relative flex flex-col items-center overflow-hidden rounded-2xl border-2 border-border/80 bg-card/60 p-4 shadow-lg sm:p-6"
      aria-label="Performance stage"
    >
      {/* Stage backdrop layer */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-50"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, var(--idol-spotlight), transparent 65%), radial-gradient(ellipse at 50% 100%, var(--idol-stage-glow), transparent 60%)',
        }}
        aria-hidden
      />

      {/* Venue badge */}
      <div className="flex w-full items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current venue
          </span>
          <span className="font-mono text-sm font-bold text-foreground">
            {venue?.name ?? '—'}
          </span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="cursor-help font-mono text-[10px]">
                {formatNumber(fans)} / {formatNumber(audience)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Fans vs. addressable audience at this venue.</p>
              <p className="text-[10px] text-muted-foreground">
                As you approach the cap, fan growth slows (logistic saturation).
                Unlock bigger venues to raise the ceiling.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Idol portrait (clickable) */}
      <button
        type="button"
        onClick={handlePerform}
        aria-label="Perform — click to gain fans and cash"
        className="group relative mt-2 flex flex-col items-center rounded-xl p-2 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
      >
        <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-3xl transition-all group-hover:bg-primary/30" />
        <IdolPortrait size={200} className="drop-shadow-[0_8px_0_oklch(0.3_0.10_350_/_0.18)]" />
      </button>

      {/* Perform button (alt click target) */}
      <button
        type="button"
        onClick={handlePerform}
        className="mt-3 w-full max-w-xs animate-idol-pulse rounded-xl bg-primary px-6 py-3 text-center font-mono text-base font-bold uppercase tracking-wider text-primary-foreground shadow-md transition-all hover:scale-[1.02] hover:bg-primary/95 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-lg"
        aria-label="Perform"
      >
        Perform
      </button>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">
        Click idol or <kbd className="rounded bg-muted px-1 font-mono text-[10px]">Space</kbd> to perform
      </p>

      {/* Saturation bar */}
      <div className="mt-4 w-full max-w-md">
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Audience saturation</span>
          <span>{saturationPct.toFixed(1)}%</span>
        </div>
        <Progress value={saturationPct} className="h-2" />
      </div>

      {/* Passive rates summary */}
      <div className="mt-4 grid w-full max-w-md grid-cols-3 gap-2 text-center">
        <RateChip label="Fans/s" value={fansPerSec} tone="pink" />
        <RateChip label="Cash/s" value={cashPerSec} tone="amber" />
        <RateChip label="Rep/s" value={repPerSec} tone="teal" />
      </div>

      {/* Session time + total clicks */}
      <div className="mt-3 flex w-full max-w-md items-center justify-between text-[10px] text-muted-foreground">
        <span>Session: {formatDuration(sessionMs)}</span>
        <span>Clicks: {formatNumber(state.stats.total_clicks)}</span>
      </div>

      {/* Floating numbers overlay */}
      <div className="pointer-events-none absolute inset-0 overflow-visible">
        {floaters.map((f) => (
          <span
            key={f.id}
            className={cn(
              'animate-float-up absolute select-none font-mono text-sm font-bold drop-shadow-sm',
              TONES[f.tone],
            )}
            style={{ left: f.x, top: f.y }}
          >
            {f.text}
          </span>
        ))}
      </div>
    </section>
  );
}

function RateChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: FloatingNumber['tone'];
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 px-2 py-1.5">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn('font-mono text-xs font-bold tabular-nums', TONES[tone])}>
        {value > 0 ? `+${formatNumber(value)}` : '0'}
      </div>
    </div>
  );
}
