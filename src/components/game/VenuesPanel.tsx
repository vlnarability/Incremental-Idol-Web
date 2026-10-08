'use client';

/**
 * VenuesPanel — list of all venues, locked/unlocked/current states, with
 * fan + rep requirements displayed. Locked venues show their gates; current
 * venue is highlighted; unlocked venues can be set as current.
 *
 * Venues raise the addressable-audience ceiling (logistic saturation cap).
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { VENUES } from '@/lib/game/engine';
import { formatNumber } from '@/lib/game/format';
import type { GameState } from '@/lib/game/types';
import type { GameActions } from '@/hooks/useGameEngine';
import { cn } from '@/lib/utils';

interface VenuesPanelProps {
  state: GameState;
  actions: GameActions;
}

export function VenuesPanel({ state, actions }: VenuesPanelProps) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Venues</h3>
        <span className="text-[10px] text-muted-foreground">
          Bigger venues raise the addressable-audience ceiling.
        </span>
      </div>
      <div className="idol-scroll -mr-2 flex-1 space-y-2 overflow-y-auto pr-2">
        {[...VENUES]
          .sort((a, b) => a.unlock_order - b.unlock_order)
          .map((venue) => {
            const isUnlocked = state.unlocked_venues.includes(venue.id);
            const isCurrent = state.current_venue_id === venue.id;
            const fansOk = state.resources.fans >= venue.fan_requirement;
            const repOk = state.resources.reputation >= venue.rep_requirement;
            const canUnlock = !isUnlocked && fansOk && repOk;
            const pct = Math.min(
              100,
              Math.max(0, (state.resources.fans / venue.fan_requirement) * 100),
            );
            return (
              <div
                key={venue.id}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  isCurrent
                    ? 'border-primary bg-primary/5'
                    : isUnlocked
                    ? 'border-border/60 bg-card/70'
                    : 'border-border/40 bg-muted/30 opacity-80',
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-sm font-bold">{venue.name}</h4>
                      {isCurrent && (
                        <Badge className="bg-primary text-primary-foreground text-[9px]">CURRENT</Badge>
                      )}
                      {isUnlocked && !isCurrent && (
                        <Badge variant="secondary" className="text-[9px]">UNLOCKED</Badge>
                      )}
                      {!isUnlocked && (
                        <Badge variant="outline" className="text-[9px]">LOCKED</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{venue.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-mono">
                      <span className="text-pink-600 dark:text-pink-300">
                        +{formatNumber(venue.base_reward_fans)} fans/click
                      </span>
                      <span className="text-amber-600 dark:text-amber-300">
                        +{formatNumber(venue.base_reward_cash)} cash/click
                      </span>
                      {venue.base_reward_rep > 0 && (
                        <span className="text-teal-600 dark:text-teal-300">
                          +{formatNumber(venue.base_reward_rep)} rep/click
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        ceiling: {formatNumber(venue.addressable_audience)} fans
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {isCurrent ? (
                      <Button size="sm" variant="secondary" disabled className="h-7 px-2 text-[11px]">
                        Active
                      </Button>
                    ) : isUnlocked ? (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => actions.setVenue(venue.id)}
                        className="h-7 px-2 text-[11px]"
                      >
                        Set as current
                      </Button>
                    ) : canUnlock ? (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => actions.unlockVenue(venue.id)}
                        className="h-7 px-2 text-[11px]"
                      >
                        Unlock
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" disabled className="h-7 px-2 text-[11px]">
                        Locked
                      </Button>
                    )}
                  </div>
                </div>

                {/* Requirements (only shown if not unlocked) */}
                {!isUnlocked && venue.fan_requirement > 0 && (
                  <div className="mt-2">
                    <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className={fansOk ? 'text-teal-600 dark:text-teal-300' : ''}>
                        Fans: {formatNumber(state.resources.fans)} / {formatNumber(venue.fan_requirement)}
                      </span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    {venue.rep_requirement > 0 && (
                      <div
                        className={cn(
                          'mt-1 text-[10px]',
                          repOk ? 'text-teal-600 dark:text-teal-300' : 'text-destructive',
                        )}
                      >
                        Rep: {formatNumber(state.resources.reputation)} / {formatNumber(venue.rep_requirement)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
