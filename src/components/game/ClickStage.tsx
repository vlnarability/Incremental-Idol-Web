'use client';

/**
 * ClickStage — the main click target. Idol portrait + big "Perform" button
 * + floating feedback text on each click + current venue display + fan
 * saturation progress bar (logistic) + live combo counter + trend mini-badge.
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
  VENUES,
} from '@/lib/game/engine';
import type { ClickResult, ComboState, GameState, TrendSnapshot } from '@/lib/game/types';
import { getArchetype } from '@/lib/game/idols';
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
  combo: ComboState;
  trend: TrendSnapshot;
  onClick: () => ClickResult | null;
  onUnlockVenue: (venueId: string) => void;
  onSetVenue: (venueId: string) => void;
}

const TONES: Record<FloatingNumber['tone'], string> = {
  pink: 'text-pink-500 dark:text-pink-300',
  amber: 'text-amber-500 dark:text-amber-300',
  teal: 'text-teal-500 dark:text-teal-300',
  purple: 'text-purple-500 dark:text-purple-300',
};

export function ClickStage({ state, combo, trend, onClick, onUnlockVenue, onSetVenue }: ClickStageProps) {
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
    // Combo callout — only when combo ≥ 3 so the screen doesn't spam text at low combos
    if (result.combo_count >= 3) {
      newOnes.push({
        id: nextId.current++,
        x: cx,
        y: cy - 50,
        text: `${result.combo_count}× COMBO`,
        tone: 'teal',
      });
    }
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

  // ---- Next venue progress (guides the player toward the next unlock) ----
  const nextVenue = VENUES
    .filter((v) => !state.unlocked_venues.includes(v.id))
    .sort((a, b) => a.unlock_order - b.unlock_order)[0] ?? null;
  const nextVenueFanPct = nextVenue
    ? Math.min(100, (fans / nextVenue.fan_requirement) * 100)
    : 100;
  const nextVenueRepPct = nextVenue && nextVenue.fame_requirement > 0
    ? Math.min(100, (state.resources.fame / nextVenue.fame_requirement) * 100)
    : 100;
  const fansMet = nextVenue ? fans >= nextVenue.fan_requirement : true;
  const fameMet = nextVenue ? state.resources.fame >= nextVenue.fame_requirement : true;

  const staffRate = staffProductionRate(state);
  const songRate = songProductionRate(state);
  const fansPerSec = staffRate.fans + songRate;
  const cashPerSec = staffRate.cash;
  const famePerSec = staffRate.reputation;

  const sessionMs = Date.now() - state.stats.started_at;

  // Combo display logic: show when count ≥ 2; ring decays over COMBO_WINDOW_MS
  // (1.5s) from last click. We compute the ring fill from wall-clock so it
  // animates smoothly even between snapshots.
  const showCombo = combo.count >= 2;
  const comboAgeMs = Date.now() - combo.last_click_at;
  const comboRingPct = Math.max(0, Math.min(100, (1 - comboAgeMs / 1500) * 100));

  return (
    <section
      ref={stageRef}
      className="relative flex flex-col items-center overflow-hidden rounded-2xl border-2 border-border/80 bg-card/60 p-4 shadow-lg sm:p-6"
      aria-label="Performance stage"
    >
      {/* Stage backdrop layer — animated spotlight sweep */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, var(--idol-spotlight), transparent 65%), radial-gradient(ellipse at 50% 100%, var(--idol-stage-glow), transparent 60%)',
        }}
        aria-hidden
      />
      {/* Animated conic spotlight that rotates slowly behind the idol */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-25"
        style={{
          background:
            'conic-gradient(from 0deg at 50% 50%, transparent 0deg, var(--idol-stage-glow) 60deg, transparent 120deg, transparent 240deg, var(--idol-spotlight) 300deg, transparent 360deg)',
          animation: 'idol-spotlight-rotate 12s linear infinite',
        }}
        aria-hidden
      />

      {/* Venue + trend badge row */}
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Current venue
          </span>
          <span className="font-mono text-sm font-bold text-foreground">
            {venue?.name ?? '—'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Trend mini-badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    'cursor-help border-primary/40 font-mono text-[10px]',
                    trend.multiplier >= 1.5
                      ? 'bg-pink-500/10 text-pink-600 dark:text-pink-300'
                      : trend.multiplier < 1
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-teal-500/10 text-teal-600 dark:text-teal-300',
                  )}
                >
                  {trend.genre} ×{trend.multiplier.toFixed(2)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px]">
                <p className="text-[11px]">
                  Active trend: <strong>{trend.genre}</strong> ({trend.phase})
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Songs in this genre produce {Math.round(trend.multiplier * 100)}% of base fans.
                  See the Trend card below for the full lifecycle.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
      </div>

      {/* Idol portrait (clickable) + combo ring overlay */}
      <button
        type="button"
        onClick={handlePerform}
        aria-label="Perform — click to gain fans and cash"
        className="group relative mt-2 flex flex-col items-center rounded-xl p-2 transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
      >
        <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-3xl transition-all group-hover:bg-primary/30" />
        {/* Combo ring — circular SVG that drains over 1.5s after each click */}
        {showCombo && (
          <svg
            className="pointer-events-none absolute inset-2 -z-0 h-[calc(100%-1rem)] w-[calc(100%-1rem)]"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle
              cx="50" cy="50" r="46"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              className={cn(
                'transition-[stroke-dashoffset] duration-100 ease-linear',
                combo.count >= 20 ? 'text-pink-500' : combo.count >= 10 ? 'text-teal-500' : 'text-purple-500',
              )}
              strokeDasharray={`${2 * Math.PI * 46}`}
              strokeDashoffset={`${2 * Math.PI * 46 * (1 - comboRingPct / 100)}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
        )}
        {/* Combo counter chip — fades in at count ≥ 2 */}
        {showCombo && (
          <div
            className={cn(
              'pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-md',
              combo.count >= 20
                ? 'bg-pink-500 text-white'
                : combo.count >= 10
                ? 'bg-teal-500 text-white'
                : 'bg-purple-500 text-white',
            )}
          >
            {combo.count}× · ×{combo.multiplier.toFixed(2)}
          </div>
        )}
        <IdolPortrait
          size={200}
          src={getArchetype(state.chosen_archetype)?.portrait ?? '/game/idol-portrait.png'}
          className="drop-shadow-[0_8px_0_oklch(0.3_0.10_350_/_0.18)]"
        />
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
        {showCombo && <span className="ml-1 text-teal-600 dark:text-teal-300">· keep clicking to extend combo!</span>}
      </p>

      {/* Saturation bar */}
      <div className="mt-4 w-full max-w-md">
        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Audience saturation</span>
          <span>{saturationPct.toFixed(1)}%</span>
        </div>
        <Progress value={saturationPct} className="h-2" />
      </div>

      {/* Next venue progress — clickable button to unlock or switch venue */}
      {nextVenue && (
        <button
          type="button"
          onClick={() => {
            if (fansMet && fameMet) {
              onUnlockVenue(nextVenue.id);
            }
          }}
          disabled={!fansMet || !fameMet}
          className={cn(
            'mt-3 w-full max-w-md rounded-lg border p-2.5 text-left transition-all',
            fansMet && fameMet
              ? 'cursor-pointer border-teal-500/50 bg-teal-500/10 hover:scale-[1.01] hover:shadow-md'
              : 'border-primary/30 bg-primary/5',
          )}
          aria-label={fansMet && fameMet ? `Unlock ${nextVenue.name}` : `Progress toward ${nextVenue.name}`}
        >
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Next: {nextVenue.name}
            </span>
            {fansMet && fameMet ? (
              <span className="flex items-center gap-1 text-[9px] font-bold text-teal-600 dark:text-teal-300">
                <span className="rounded bg-teal-500 px-1.5 py-0.5 text-white">TAP TO UNLOCK</span>
              </span>
            ) : (
              <span className="text-[9px] text-muted-foreground">{nextVenue.fan_requirement > 0 ? `${formatNumber(nextVenue.fan_requirement)} fans` : ''}{nextVenue.fan_requirement > 0 && nextVenue.fame_requirement > 0 ? ' · ' : ''}{nextVenue.fame_requirement > 0 ? `${formatNumber(nextVenue.fame_requirement)} fame` : ''}</span>
            )}
          </div>
          {nextVenue.fan_requirement > 0 && (
            <div className="mb-1">
              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                <span className={fansMet ? 'text-teal-600 dark:text-teal-300' : ''}>Fans</span>
                <span className="font-mono">{formatNumber(fans)} / {formatNumber(nextVenue.fan_requirement)}</span>
              </div>
              <Progress value={nextVenueFanPct} className="mt-0.5 h-1.5" />
            </div>
          )}
          {nextVenue.fame_requirement > 0 && (
            <div>
              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                <span className={fameMet ? 'text-teal-600 dark:text-teal-300' : ''}>Fame</span>
                <span className="font-mono">{state.resources.fame < 10 ? state.resources.fame.toFixed(1) : formatNumber(state.resources.fame)} / {formatNumber(nextVenue.fame_requirement)}</span>
              </div>
              <Progress value={nextVenueRepPct} className="mt-0.5 h-1.5" />
            </div>
          )}
        </button>
      )}
      {!nextVenue && (
        <div className="mt-3 w-full max-w-md rounded-lg border border-amber-500/40 bg-amber-500/5 p-2.5 text-center">
          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-300">
            🏟️ All venues unlocked — you've conquered the Idol era!
          </span>
        </div>
      )}

      {/* Passive rates summary — always visible (no collapsible) */}
      <div className="mt-4 grid w-full max-w-md grid-cols-3 gap-2 text-center">
        <RateChip label="Fans/s" value={fansPerSec} tone="pink" />
        <RateChip label="Cash/s" value={cashPerSec} tone="amber" />
        <RateChip label="Fame/s" value={famePerSec} tone="teal" />
      </div>

      {/* Session time + total clicks — always visible */}
      <div className="mt-2 flex w-full max-w-md items-center justify-between text-[10px] text-muted-foreground">
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

