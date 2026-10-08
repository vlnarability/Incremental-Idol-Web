'use client';

/**
 * GameToaster — renders the game's toast notification queue (achievement
 * unlocks, event spawns, milestones) as animated slide-in cards stacked
 * in the bottom-right corner. Auto-dismisses after 4.5s (handled by the
 * hook). Click to dismiss early.
 *
 * This is a dedicated game toast system separate from the app-level sonner/
 * shadcn Toaster — so game notifications can be themed with the idol palette
 * without conflicting with any app-level toasts.
 */

import { useEffect } from 'react';
import { X } from 'lucide-react';
import type { GameToast } from '@/lib/game/types';
import { cn } from '@/lib/utils';

interface GameToasterProps {
  toasts: GameToast[];
  onDismiss: (id: number) => void;
}

const TINT_CLASSES: Record<GameToast['tint'], string> = {
  pink: 'border-pink-500/50 bg-gradient-to-br from-pink-500/15 to-pink-500/5',
  amber: 'border-amber-500/50 bg-gradient-to-br from-amber-500/15 to-amber-500/5',
  teal: 'border-teal-500/50 bg-gradient-to-br from-teal-500/15 to-teal-500/5',
  purple: 'border-purple-500/50 bg-gradient-to-br from-purple-500/15 to-purple-500/5',
};

const TINT_ICON: Record<GameToast['tint'], string> = {
  pink: 'text-pink-600 dark:text-pink-300',
  amber: 'text-amber-600 dark:text-amber-300',
  teal: 'text-teal-600 dark:text-teal-300',
  purple: 'text-purple-600 dark:text-purple-300',
};

const TINT_LABEL: Record<GameToast['kind'], string> = {
  achievement: 'Achievement Unlocked',
  event: 'New Event',
  milestone: 'Milestone',
};

export function GameToaster({ toasts, onDismiss }: GameToasterProps) {
  // Auto-prune toasts that have been visible longer than 4.5s. The hook
  // also schedules this, but this is a safety net in case the hook's timer
  // was cleared (e.g. by HMR).
  useEffect(() => {
    if (toasts.length === 0) return;
    const now = Date.now();
    const stale = toasts.filter((t) => now - t.queued_at > 5000);
    if (stale.length === 0) return;
    const id = window.setTimeout(() => {
      for (const t of stale) onDismiss(t.id);
    }, 100);
    return () => window.clearTimeout(id);
  }, [toasts, onDismiss]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-label="Game notifications"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => onDismiss(toast.id)}
          className={cn(
            'animate-toast-in pointer-events-auto flex w-72 items-start gap-3 rounded-xl border-2 p-3 text-left shadow-lg backdrop-blur-md transition-all hover:scale-[1.02] active:scale-95',
            TINT_CLASSES[toast.tint],
          )}
        >
          <span className="text-2xl leading-none" aria-hidden>
            {toast.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className={cn('text-[9px] font-bold uppercase tracking-wider', TINT_ICON[toast.tint])}>
              {TINT_LABEL[toast.kind]}
            </div>
            <div className="truncate text-sm font-bold text-foreground">
              {toast.title}
            </div>
            {toast.description && (
              <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                {toast.description}
              </div>
            )}
          </div>
          <X className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      ))}
    </div>
  );
}
