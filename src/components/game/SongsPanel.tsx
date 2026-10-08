'use client';

/**
 * SongsPanel — release new songs (cash + fame cost) and inspect active songs
 * with their current production rate (decaying exponentially since release,
 * multiplied by the active trend if the song's genre matches).
 *
 * Each song card shows a "TRENDING" badge when its genre matches the active
 * trend, and the effective multiplier. Released songs show their trend-boosted
 * rate in real time.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Flame } from 'lucide-react';
import { SONGS, songProductionRate } from '@/lib/game/engine';
import { formatNumber, formatDuration } from '@/lib/game/format';
import type { GameState, TrendSnapshot } from '@/lib/game/types';
import type { GameActions } from '@/hooks/useGameEngine';
import { cn } from '@/lib/utils';

interface SongsPanelProps {
  state: GameState;
  actions: GameActions;
  trend: TrendSnapshot;
}

export function SongsPanel({ state, actions, trend }: SongsPanelProps) {
  const activeSongRate = songProductionRate(state); // total fans/sec (trend-aware)
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Songs</h3>
        <span className="text-[10px] text-muted-foreground">
          Active rate: <span className="font-mono text-pink-600 dark:text-pink-300">+{formatNumber(activeSongRate)}/s</span>
        </span>
      </div>

      {/* Release grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SONGS.map((song) => {
          const alreadyReleased = state.released_songs.some((s) => s.def_id === song.id);
          const fansMet = state.resources.fans >= song.fan_unlock;
          const canRelease = fansMet && !alreadyReleased;
          const isTrending = song.genre === trend.genre;
          return (
            <div
              key={song.id}
              className={cn(
                'idol-card-hover flex flex-col rounded-lg border bg-card/70 p-2.5',
                isTrending
                  ? 'border-pink-500/50 ring-1 ring-pink-500/20'
                  : 'border-border/60',
                !canRelease && 'opacity-70',
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <h4 className="truncate text-xs font-bold">{song.name}</h4>
                {isTrending ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge className="cursor-help bg-pink-500 text-white text-[9px]">
                          <Flame className="mr-0.5 h-2.5 w-2.5" />
                          TRENDING
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[220px]">
                        <p className="text-[11px]">
                          {song.genre} is the active trend ({trend.phase}).
                          Releases now will produce <strong>{Math.round(trend.multiplier * 100)}%</strong> of base fans.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Badge variant="secondary" className="text-[9px]">{song.genre}</Badge>
                )}
              </div>
              <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{song.description}</p>
              <div className="mt-1.5 text-[10px] font-mono">
                {alreadyReleased ? (
                  <span className="text-muted-foreground">Released ✓</span>
                ) : (
                  <span className={fansMet ? 'text-foreground' : 'text-destructive'}>
                    Unlocks at {formatNumber(song.fan_unlock)} fans
                  </span>
                )}
              </div>
              <div className="mt-1 text-[9px] text-muted-foreground">
                Base quality ×{song.base_quality.toFixed(1)} · decays τ={formatDuration(song.decay_tau_minutes * 60_000)}
              </div>
              {isTrending && (
                <div className="mt-1 rounded bg-pink-500/10 px-1.5 py-0.5 text-[9px] font-bold text-pink-600 dark:text-pink-300">
                  Now: ×{trend.multiplier.toFixed(2)} fan output
                </div>
              )}
              <Button
                size="sm"
                variant={canRelease ? 'default' : 'secondary'}
                disabled={!canRelease}
                onClick={() => actions.releaseSong(song.id)}
                className="mt-2 h-7 text-[11px]"
              >
                {alreadyReleased ? 'Released' : 'Release'}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Active songs list */}
      <div className="flex min-h-0 flex-1 flex-col">
        <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Released (newest first)
        </h4>
        <div className="idol-scroll -mr-2 min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-2">
          {state.released_songs.length === 0 ? (
            <p className="py-4 text-center text-[11px] text-muted-foreground">
              No songs released yet. Release one above to start passive fan growth.
              <br />
              <span className="text-pink-600 dark:text-pink-300">Tip: release in the trending genre for a boost!</span>
            </p>
          ) : (
            [...state.released_songs]
              .sort((a, b) => b.released_at - a.released_at)
              .map((song) => {
                const def = SONGS.find((s) => s.id === song.def_id);
                if (!def) return null;
                const ageMs = Math.max(0, state.last_saved_at - song.released_at);
                const tauMs = def.decay_tau_minutes * 60_000;
                const pct = Math.max(0, Math.min(100, Math.exp(-ageMs / tauMs) * 100));
                const trendMult = song.genre === trend.genre ? trend.multiplier : 1;
                const rate = 0.5 * song.quality * Math.exp(-ageMs / tauMs) * trendMult;
                const isTrending = song.genre === trend.genre;
                return (
                  <div
                    key={`${song.def_id}-${song.released_at}`}
                    className={cn(
                      'idol-card-hover rounded-md border bg-background/60 p-2',
                      isTrending ? 'border-pink-500/40' : 'border-border/50',
                    )}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold">{song.name}</span>
                      <span className="font-mono text-pink-600 dark:text-pink-300">
                        +{formatNumber(rate)}/s
                        {isTrending && (
                          <span className="ml-1 text-[9px] text-pink-500">×{trendMult.toFixed(2)}</span>
                        )}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <Progress value={pct} className="h-1.5" />
                      <span className="w-8 text-right text-[9px] tabular-nums text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[9px] text-muted-foreground">
                      <span>age {formatDuration(ageMs)} · quality ×{song.quality.toFixed(2)}</span>
                      {isTrending && (
                        <span className="font-bold text-pink-600 dark:text-pink-300">TRENDING</span>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}
