'use client';

/**
 * VenueSelectModal — shown when the player clicks End Week. Lets them
 * choose which venue to perform at. Higher venues cost more to perform.
 * Has a select (radio-style) + Perform button at bottom + X to close.
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VENUES } from '@/lib/game/engine';
import { formatNumber } from '@/lib/game/format';
import type { GameState } from '@/lib/game/types';
import { cn } from '@/lib/utils';

interface VenueSelectModalProps {
  open: boolean;
  state: GameState;
  onPerform: (venueId: string) => void;
  onUnlock: (venueId: string) => void;
  onCancel: () => void;
}

export function VenueSelectModal({ open, state, onPerform, onUnlock, onCancel }: VenueSelectModalProps) {
  const [selected, setSelected] = useState<string>(state.current_venue_id);

  const availableVenues = VENUES
    .filter(v => v.min_progression_level <= state.progression_level)
    .sort((a, b) => a.unlock_order - b.unlock_order);

  const selectedVenue = VENUES.find(v => v.id === selected);
  const perfCost = selectedVenue?.performance_cost ?? 0;
  const canAfford = state.resources.cash >= perfCost;
  const isSelectedUnlocked = selectedVenue ? state.unlocked_venues.includes(selectedVenue.id) : false;
  const canPerform = isSelectedUnlocked && canAfford;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md border-2 border-primary/40 bg-card p-0">
        {/* X close button */}
        <button
          onClick={onCancel}
          className="absolute right-3 top-3 z-10 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <DialogHeader className="px-5 pt-4 pr-10">
          <DialogTitle className="text-lg font-bold text-primary">
            Choose Your Venue
          </DialogTitle>
          <p className="text-[10px] text-muted-foreground">
            Bigger venues = bigger payouts, but they cost more to perform at.
            You have {formatNumber(state.resources.cash)} cash.
          </p>
        </DialogHeader>

        <div className="idol-scroll -mr-2 max-h-[50vh] space-y-1.5 overflow-y-auto px-5 pb-2 pr-2">
          {availableVenues.map((venue) => {
            const isUnlocked = state.unlocked_venues.includes(venue.id);
            const isCurrent = state.current_venue_id === venue.id;
            const isSelected = selected === venue.id;
            const fansMet = state.resources.fans >= venue.fan_requirement;
            const fameMet = state.resources.fame >= venue.fame_requirement;
            const canUnlock = !isUnlocked && fansMet && fameMet;
            const canAffordThis = state.resources.cash >= venue.performance_cost;

            return (
              <button
                key={venue.id}
                type="button"
                onClick={() => { if (isUnlocked) setSelected(venue.id); }}
                disabled={!isUnlocked}
                className={cn(
                  'w-full rounded-lg border p-2.5 text-left transition-all',
                  isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border/60 bg-background/60',
                  !isUnlocked && 'opacity-50 cursor-not-allowed',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'h-3 w-3 shrink-0 rounded-full border-2',
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground',
                        )}
                        aria-hidden
                      />
                      <h4 className="truncate text-xs font-bold">{venue.name}</h4>
                      {isCurrent && <Badge className="bg-primary text-primary-foreground text-[7px]">CURRENT</Badge>}
                      <Badge variant="outline" className="text-[7px] font-mono">T{venue.unlock_order + 1}</Badge>
                      {!isUnlocked && canUnlock && <Badge className="bg-teal-500 text-white text-[7px]">UNLOCK</Badge>}
                      {!isUnlocked && !canUnlock && <Badge variant="outline" className="text-[7px]">LOCKED</Badge>}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[8px] font-mono">
                      <span className="text-pink-600 dark:text-pink-300">+{formatNumber(venue.base_reward_fans)} fans</span>
                      <span className="text-amber-600 dark:text-amber-300">+{formatNumber(venue.base_reward_cash)} cash</span>
                      {venue.base_reward_fame > 0 && <span className="text-teal-600 dark:text-teal-300">+{formatNumber(venue.base_reward_fame)} fame</span>}
                      {venue.performance_cost > 0 && (
                        <span className={canAffordThis ? 'text-foreground/60' : 'text-destructive'}>
                          Cost: ${formatNumber(venue.performance_cost)}
                        </span>
                      )}
                    </div>
                    {!isUnlocked && !canUnlock && (
                      <span className="text-[7px] text-muted-foreground">
                        Need: {venue.fan_requirement > 0 ? `${formatNumber(venue.fan_requirement)} fans` : ''}
                        {venue.fan_requirement > 0 && venue.fame_requirement > 0 ? ' · ' : ''}
                        {venue.fame_requirement > 0 ? `${formatNumber(venue.fame_requirement)} fame` : ''}
                      </span>
                    )}
                  </div>
                  {!isUnlocked && canUnlock && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={(e) => { e.stopPropagation(); onUnlock(venue.id); }}
                      className="h-6 px-1.5 text-[8px]"
                    >
                      Unlock
                    </Button>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Bottom: Perform button */}
        <div className="border-t border-border/60 px-5 py-3">
          <Button
            size="lg"
            variant={canPerform ? 'default' : 'secondary'}
            disabled={!canPerform}
            onClick={() => onPerform(selected)}
            className="h-11 w-full gap-1.5 font-mono text-sm font-bold uppercase tracking-wider"
          >
            {canPerform
              ? `Perform at ${selectedVenue?.name}${perfCost > 0 ? ` · $${formatNumber(perfCost)}` : ''}`
              : !isSelectedUnlocked
                ? 'Select an unlocked venue'
                : `Need $${formatNumber(perfCost - state.resources.cash)} more`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
