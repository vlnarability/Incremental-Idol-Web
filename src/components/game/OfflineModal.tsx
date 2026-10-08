'use client';

/**
 * OfflineModal — shown when the player returns after >1 minute of being away.
 * Reports elapsed time (capped), per-resource gains, and which cap was used.
 * Per the brief: "A summary screen showing the elapsed time, resources gained,
 * and costs incurred."
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GameIcon } from './icons';
import { formatNumber, formatDuration } from '@/lib/game/format';
import type { OfflineSummary } from '@/lib/game/types';

interface OfflineModalProps {
  summary: OfflineSummary | null;
  onDismiss: () => void;
}

export function OfflineModal({ summary, onDismiss }: OfflineModalProps) {
  // Auto-dismiss on Escape, but the user must explicitly click "Collect"
  // for agency — we don't auto-collect resources (they're already applied
  // to state by the engine; the modal is informational only).
  useEffect(() => {
    if (!summary) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [summary, onDismiss]);

  return (
    <Dialog open={summary !== null} onOpenChange={(o) => { if (!o) onDismiss(); }}>
      <DialogContent className="max-w-sm border-2 border-primary/40 bg-card">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold text-primary">
            Welcome back!
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            Your team kept the show running while you were away.
          </DialogDescription>
        </DialogHeader>

        {summary && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/60 bg-background/60 p-3 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Elapsed
              </div>
              <div className="font-mono text-lg font-bold">
                {formatDuration(summary.elapsed_ms)}
              </div>
              {summary.capped && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400">
                  (capped — offline production limited)
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <SummaryLine kind="fans" label="Fans" value={summary.fans_gained} />
              <SummaryLine kind="cash" label="Cash" value={summary.cash_gained} />
              <SummaryLine kind="rep" label="Rep" value={summary.rep_gained} />
            </div>

            <p className="text-center text-[10px] text-muted-foreground">
              Production ran at <strong>75%</strong> efficiency while offline.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onDismiss} className="w-full">
            Collect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryLine({
  kind,
  label,
  value,
}: {
  kind: 'fans' | 'cash' | 'rep';
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center rounded-md border border-border/60 bg-background/60 p-2">
      <GameIcon kind={kind} size={20} />
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-xs font-bold text-primary">
        +{formatNumber(value)}
      </div>
    </div>
  );
}
