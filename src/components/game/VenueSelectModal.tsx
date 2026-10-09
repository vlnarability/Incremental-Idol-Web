'use client';

/**
 * VenueSelectModal — shown when the player clicks End Week. Lets them
 * choose which venue to perform at. The selected venue determines the
 * End Week payout (bigger venue = bigger rewards).
 *
 * Per user: "The venues tab doesn't make sense, it should be a selection
 * after clicking perform to end the week."
 */

import { Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VENUES, getVenueDef } from '@/lib/game/engine';
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
  const availableVenues = VENUES
    .filter(v => v.min_progression_level <= state.progression_level)
    .sort((a, b) => a.unlock_order - b.unlock_order);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md border-2 border-primary/40 bg-card p-0" showCloseButton={false}>
        <DialogHeader className="px-5 pt-4">
          <DialogTitle className="text-center text-lg font-bold text-primary">
            Choose Your Venue
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            Where will you perform this week? Bigger venues = bigger payouts.
          </DialogDescription>
        </DialogHeader>

        <div className="idol-scroll -mr-2 max-h-[60vh] space-y-2 overflow-y-auto px-5 pb-4 pr-2">
          {availableVenues.map((venue) => {
            const isUnlocked = state.unlocked_venues.includes(venue.id);
            const isCurrent = state.current_venue_id === venue.id;
            const fansMet = state.resources.fans >= venue.fan_requirement;
            const fameMet = state.resources.fame >= venue.fame_requirement;
            const canUnlock = !isUnlocked && fansMet && fameMet;

            return (
              <div
                key={venue.id}
                className={cn(
                  'rounded-lg border p-3 transition-all',
                  isCurrent ? 'border-primary bg-primary/5' : 'border-border/60 bg-background/60',
                  !isUnlocked && !canUnlock && 'opacity-50',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-sm font-bold">{venue.name}</h4>
                      <Badge variant="outline" className="text-[8px] font-mono">T{venue.unlock_order + 1}</Badge>
                      {isCurrent && <Badge className="bg-primary text-primary-foreground text-[8px]">CURRENT</Badge>}
                      {!isUnlocked && canUnlock && <Badge className="bg-teal-500 text-white text-[8px]">UNLOCK</Badge>}
                      {!isUnlocked && !canUnlock && <Badge variant="outline" className="text-[8px]">LOCKED</Badge>}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-muted-foreground">{venue.description}</p>
                    <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] font-mono">
                      <span className="text-pink-600 dark:text-pink-300">+{formatNumber(venue.base_reward_fans)} fans</span>
                      <span className="text-amber-600 dark:text-amber-300">+{formatNumber(venue.base_reward_cash)} cash</span>
                      {venue.base_reward_fame > 0 && (
                        <span className="text-teal-600 dark:text-teal-300">+{formatNumber(venue.base_reward_fame)} fame</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isUnlocked ? (
                      <Button
                        size="sm"
                        variant={isCurrent ? 'secondary' : 'default'}
                        disabled={isCurrent}
                        onClick={() => onPerform(venue.id)}
                        className="h-7 px-2 text-[10px]"
                      >
                        {isCurrent ? 'Active' : 'Perform'}
                      </Button>
                    ) : canUnlock ? (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onUnlock(venue.id)}
                        className="h-7 px-2 text-[10px]"
                      >
                        Unlock
                      </Button>
                    ) : (
                      <span className="text-[8px] text-muted-foreground">
                        {venue.fan_requirement > 0 ? `${formatNumber(venue.fan_requirement)} fans` : ''}
                        {venue.fan_requirement > 0 && venue.fame_requirement > 0 ? ' · ' : ''}
                        {venue.fame_requirement > 0 ? `${formatNumber(venue.fame_requirement)} fame` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2 px-5 pb-4">
          <Button variant="ghost" onClick={onCancel} className="flex-1 text-xs">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
