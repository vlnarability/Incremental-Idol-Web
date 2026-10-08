'use client';

/**
 * MilestonesModal — career progression timeline accessible via a clock-history
 * icon in the ResourceBar. Shows chronological milestones (first click,
 * first song, first hire, venue unlocks, achievement unlocks) with relative
 * timestamps and themed tint dots.
 *
 * Per the brief §3.E "Achievements that encourage unusual builds" — this
 * visualizes the player's journey, not just current state.
 */

import { History, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDuration } from '@/lib/game/format';
import type { Milestone } from '@/lib/game/types';
import { cn } from '@/lib/utils';

interface MilestonesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  milestones: Milestone[];
}

const TINT_DOT: Record<Milestone['tint'], string> = {
  pink: 'bg-pink-500',
  amber: 'bg-amber-500',
  teal: 'bg-teal-500',
  purple: 'bg-purple-500',
};

const TINT_LINE: Record<Milestone['tint'], string> = {
  pink: 'bg-pink-500/40',
  amber: 'bg-amber-500/40',
  teal: 'bg-teal-500/40',
  purple: 'bg-purple-500/40',
};

export function MilestonesModal({ open, onOpenChange, milestones }: MilestonesModalProps) {
  // Newest first for display (reversed from storage order).
  const sorted = [...milestones].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-2 border-primary/40 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-primary">
            <History className="h-5 w-5" />
            Career Timeline
          </DialogTitle>
          <DialogDescription>
            {milestones.length === 0
              ? 'Your journey begins with the first click.'
              : `${milestones.length} milestone${milestones.length === 1 ? '' : 's'} recorded so far.`}
          </DialogDescription>
        </DialogHeader>

        <div className="idol-scroll -mr-2 max-h-[60vh] overflow-y-auto pr-2">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-xs text-muted-foreground">
                No milestones yet.
                <br />
                Click the idol to begin your career!
              </p>
            </div>
          ) : (
            <ol className="relative space-y-3">
              {/* Vertical timeline line */}
              <span
                className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border"
                aria-hidden
              />
              {sorted.map((m, i) => {
                const ageMs = Date.now() - m.timestamp;
                return (
                  <li key={m.id} className="relative flex items-start gap-3 pl-0">
                    {/* Tinted dot on the timeline */}
                    <span
                      className={cn(
                        'relative z-10 mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-card',
                        TINT_DOT[m.tint],
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-background/60 p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none" aria-hidden>{m.icon}</span>
                        <span className="truncate text-xs font-bold text-foreground">
                          {m.label}
                        </span>
                        <span className="ml-auto shrink-0 font-mono text-[9px] tabular-nums text-muted-foreground">
                          {formatDuration(ageMs)} ago
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** History icon button for the ResourceBar. Renders the trigger + modal. */
export function MilestonesButton({ open, onOpenChange, milestones }: MilestonesModalProps) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onOpenChange(true)}
        className="relative h-7 w-7 border-primary/40 p-0 hover:border-primary/60"
        aria-label={`View career timeline: ${milestones.length} milestones`}
      >
        <History className="h-3.5 w-3.5" />
        {milestones.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 font-mono text-[8px] font-bold text-primary-foreground">
            {milestones.length > 99 ? '99+' : milestones.length}
          </span>
        )}
      </Button>
      <MilestonesModal open={open} onOpenChange={onOpenChange} milestones={milestones} />
    </>
  );
}
