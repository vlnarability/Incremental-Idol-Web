'use client';

/**
 * SongsPanel — release new songs (milestone-gated by fan count) and inspect
 * active songs with their current production rate (decaying exponentially
 * since release).
 *
 * Each song card shows the song's genre and base quality. Released songs
 * show their live fan-production rate in real time.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SONGS, songProductionRate } from '@/lib/game/engine';
import { formatNumber, formatDuration } from '@/lib/game/format';
import type { GameState } from '@/lib/game/types';
import type { GameActions } from '@/hooks/useGameEngine';
import { cn } from '@/lib/utils';

interface SongsPanelProps {
  state: GameState;
  actions: GameActions;
}

export function SongsPanel({ state, actions }: SongsPanelProps) {
  const songRate = songProductionRate(state);
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Songs</h3>
        <span className="text-[10px] text-muted-foreground">
          Active rate: <span className="font-mono text-pink-600 dark:text-pink-300">+{formatNumber(songRate.fans)}/s</span>
        </span>
      </div>

      {/* Release grid */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SONGS.map((song) => {
          const alreadyReleased = state.released_songs.some((s) => s.def_id === song.id);
          const fansMet = state.resources.fans >= song.fan_unlock;
          const canRelease = fansMet && !alreadyReleased;
          return (
            <div
              key={song.id}
              className={cn(
                'idol-card-hover flex flex-col rounded-lg border border-border/60 bg-card/70 p-2.5',
                !canRelease && 'opacity-70',
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <h4 className="truncate text-xs font-bold">{song.name}</h4>
                <Badge variant="secondary" className="text-[9px]">{song.genre}</Badge>
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
                const rate = 0.5 * song.quality * Math.exp(-ageMs / tauMs);
                return (
                  <div
                    key={`${song.def_id}-${song.released_at}`}
                    className="idol-card-hover rounded-md border border-border/50 bg-background/60 p-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold">{song.name}</span>
                      <span className="font-mono text-pink-600 dark:text-pink-300">
                        +{formatNumber(rate)}/s
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
