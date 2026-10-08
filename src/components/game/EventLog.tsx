'use client';

/**
 * EventLog — compact, scrollable feed of recent event outcomes. Shown in the
 * footer beside the DebugPanel. Each entry shows the event name, the choice
 * the player made, the outcome text, and a relative timestamp.
 *
 * Newest entries are at the top. Capped at 20 (mirrors the engine ring buffer).
 */

import { Bell } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { EventLogEntry } from '@/lib/game/types';
import { formatDuration } from '@/lib/game/format';
import { cn } from '@/lib/utils';

interface EventLogProps {
  entries: EventLogEntry[];
}

const TINT_DOT: Record<EventLogEntry['tint'], string> = {
  pink: 'bg-pink-500',
  amber: 'bg-amber-500',
  teal: 'bg-teal-500',
  purple: 'bg-purple-500',
};

export function EventLog({ entries }: EventLogProps) {
  const hasEntries = entries.length > 0;
  return (
    <aside
      className="rounded-xl border border-border/60 bg-card/60 p-2"
      aria-label="Recent events"
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        <Bell className={cn('h-3 w-3', hasEntries ? 'text-primary' : 'text-muted-foreground')} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Event Log
        </span>
        {hasEntries && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-auto cursor-help rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                  {entries.length}
                </span>
              </TooltipTrigger>
              <TooltipContent>Recent event outcomes (max 20)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="idol-scroll max-h-32 overflow-y-auto pr-1">
        {entries.length === 0 ? (
          <p className="py-2 text-center text-[10px] text-muted-foreground">
            Events spawn every ~90s. Check back soon!
          </p>
        ) : (
          <ul className="space-y-1">
            {entries.map((entry, i) => {
              const ageMs = Date.now() - entry.timestamp;
              return (
                <li
                  key={`${entry.event_name}-${entry.timestamp}-${i}`}
                  className="rounded-md bg-background/50 p-1.5 text-[10px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TINT_DOT[entry.tint])} aria-hidden />
                    <span className="truncate font-bold text-foreground">{entry.event_name}</span>
                    <span className="ml-auto shrink-0 font-mono text-muted-foreground">
                      {formatDuration(ageMs)} ago
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    <span className="font-semibold text-primary">{entry.choice_label}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="truncate text-muted-foreground">{entry.outcome_text}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
