'use client';

/**
 * ClickStage — display-only idol stage backdrop.
 *
 * The portrait is purely visual (no click action); the only performance
 * action is End Week, in StatPanel. This panel shows:
 *   - Animated spotlight backdrop + stage glow
 *   - Current venue badge + fans-vs-audience tooltip
 *   - Idol portrait (chosen archetype)
 *   - Saturation bar (logistic, vs. addressable audience)
 *   - Next venue progress button (clickable when requirements met)
 *   - Passive rates strip (fans/cash/fame per second from released songs)
 */

import { IdolPortrait } from './icons';
import { formatNumber, formatDuration } from '@/lib/game/format';
import {
  addressableAudience,
  getVenueDef,
  songProductionRate,
  VENUES,
} from '@/lib/game/engine';
import type { GameState } from '@/lib/game/types';
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

interface ClickStageProps {
  state: GameState;
  onUnlockVenue: (venueId: string) => void;
  onSetVenue: (venueId: string) => void;
}

export function ClickStage({ state, onUnlockVenue, onSetVenue }: ClickStageProps) {
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

  const songRate = songProductionRate(state);
  // Songs produce all three core resources passively (fans, cash, fame),
  // each decaying exponentially since the song's release.
  const fansPerSec = songRate.fans;
  const cashPerSec = songRate.cash;
  const famePerSec = songRate.fame;

  return (
    <section
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

      {/* Venue + audience badge row */}
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

      {/* Idol portrait — display only (not clickable) */}
      <div className="group relative mt-2 flex flex-col items-center rounded-xl p-2">
        <div className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-3xl transition-all group-hover:bg-primary/30" />
        <IdolPortrait
          size={200}
          src={getArchetype(state.chosen_archetype)?.portrait ?? '/game/idol-portrait.png'}
          className="drop-shadow-[0_8px_0_oklch(0.3_0.10_350_/_0.18)]"
        />
      </div>

      {/* Saturation + venue progress — compact combined section */}
      <div className="mt-3 w-full max-w-md space-y-1.5">
        <div>
          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <span>Saturation</span>
            <span>{saturationPct.toFixed(0)}%</span>
          </div>
          <Progress value={saturationPct} className="mt-0.5 h-1.5" />
        </div>

        {/* Next venue — clickable when ready */}
        {nextVenue && (
          <button
            type="button"
            onClick={() => { if (fansMet && fameMet) onUnlockVenue(nextVenue.id); }}
            disabled={!fansMet || !fameMet}
            className={cn(
              'w-full rounded-md border p-1.5 text-left transition-all',
              fansMet && fameMet
                ? 'cursor-pointer border-teal-500/50 bg-teal-500/10 hover:scale-[1.01]'
                : 'border-border/40 bg-muted/20',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                {nextVenue.name}
              </span>
              {fansMet && fameMet ? (
                <span className="rounded bg-teal-500 px-1 py-0.5 text-[8px] font-bold text-white">UNLOCK</span>
              ) : (
                <span className="text-[8px] text-muted-foreground">
                  {nextVenue.fan_requirement > 0 ? `${formatNumber(nextVenue.fan_requirement)} fans` : ''}
                  {nextVenue.fan_requirement > 0 && nextVenue.fame_requirement > 0 ? ' · ' : ''}
                  {nextVenue.fame_requirement > 0 ? `${formatNumber(nextVenue.fame_requirement)} fame` : ''}
                </span>
              )}
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              {nextVenue.fan_requirement > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[8px] text-muted-foreground">
                    <span>Fans</span>
                    <span className="font-mono">{formatNumber(Math.min(fans, nextVenue.fan_requirement))}/{formatNumber(nextVenue.fan_requirement)}</span>
                  </div>
                  <Progress value={nextVenueFanPct} className="mt-0.5 h-1" />
                </div>
              )}
              {nextVenue.fame_requirement > 0 && (
                <div>
                  <div className="flex items-center justify-between text-[8px] text-muted-foreground">
                    <span>Fame</span>
                    <span className="font-mono">{state.resources.fame < 10 ? state.resources.fame.toFixed(1) : formatNumber(state.resources.fame)}/{formatNumber(nextVenue.fame_requirement)}</span>
                  </div>
                  <Progress value={nextVenueRepPct} className="mt-0.5 h-1" />
                </div>
              )}
            </div>
          </button>
        )}
        {!nextVenue && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-1.5 text-center">
            <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-300">
              🏟️ All venues unlocked!
            </span>
          </div>
        )}

        {/* Passive rates — compact inline */}
        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
          <span>Fans +{formatNumber(fansPerSec)}/s</span>
          <span>Cash +{formatNumber(cashPerSec)}/s</span>
          <span>Fame +{famePerSec < 0.01 ? famePerSec.toFixed(3) : formatNumber(famePerSec)}/s</span>
        </div>
      </div>
    </section>
  );
}
