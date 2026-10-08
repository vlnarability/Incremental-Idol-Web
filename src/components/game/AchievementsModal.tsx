'use client';

/**
 * AchievementsModal — shows all 13 achievements, locked and unlocked, with
 * progress bars for the ones that support `progress_fn`. Opened via a
 * trophy icon button in the ResourceBar.
 *
 * Per the brief §3.E "Achievements that encourage unusual builds" and §8
 * "optional challenges with specific constraints".
 */

import { Trophy } from 'lucide-react';
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
import type { AchievementDefinition, GameState } from '@/lib/game/types';
import { formatNumber } from '@/lib/game/format';
import { cn } from '@/lib/utils';

interface AchievementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievements: AchievementDefinition[];
  state: GameState;
}

export function AchievementsModal({
  open,
  onOpenChange,
  achievements,
  state,
}: AchievementsModalProps) {
  const unlockedSet = new Set(state.unlocked_achievements);
  const unlockedCount = achievements.filter((a) => unlockedSet.has(a.id)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-2 border-primary/40 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-primary">
            <Trophy className="h-5 w-5" />
            Achievements
          </DialogTitle>
          <DialogDescription>
            {unlockedCount} of {achievements.length} unlocked · {Math.round((unlockedCount / achievements.length) * 100)}% complete
          </DialogDescription>
        </DialogHeader>

        <div className="idol-scroll -mr-2 max-h-[60vh] space-y-2 overflow-y-auto pr-2">
          {achievements.map((def) => {
            const isUnlocked = unlockedSet.has(def.id);
            const progress = def.progress_fn?.(state) ?? null;
            const pct = progress && progress.target > 0
              ? Math.min(100, (progress.current / progress.target) * 100)
              : isUnlocked ? 100 : 0;
            return (
              <div
                key={def.id}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                  isUnlocked
                    ? 'border-teal-500/40 bg-teal-500/5'
                    : 'border-border/50 bg-muted/30',
                )}
              >
                <span
                  className={cn(
                    'text-2xl leading-none',
                    !isUnlocked && 'opacity-30 grayscale',
                  )}
                  aria-hidden
                >
                  {def.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className={cn('truncate text-sm font-bold', !isUnlocked && 'text-muted-foreground')}>
                      {def.name}
                    </h4>
                    {isUnlocked && (
                      <Badge className="bg-teal-500 text-white text-[9px]">UNLOCKED</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{def.description}</p>
                  {progress && !isUnlocked && (
                    <div className="mt-1.5">
                      <div className="mb-0.5 flex items-center justify-between text-[9px] text-muted-foreground">
                        <span className="font-mono">
                          {formatNumber(progress.current)} / {formatNumber(progress.target)}
                        </span>
                        <span>{pct.toFixed(0)}%</span>
                      </div>
                      <Progress value={pct} className="h-1" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Trophy icon button for the ResourceBar. Renders the trigger + modal. */
export function AchievementsButton({
  open,
  onOpenChange,
  achievements,
  state,
}: AchievementsModalProps) {
  const unlockedCount = state.unlocked_achievements.length;
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onOpenChange(true)}
        className="relative h-8 gap-1 border-primary/40 px-2"
        aria-label={`Achievements: ${unlockedCount} of ${achievements.length} unlocked`}
      >
        <Trophy className="h-3.5 w-3.5 text-amber-500" />
        <span className="font-mono text-[10px] font-bold tabular-nums">{unlockedCount}/{achievements.length}</span>
      </Button>
      <AchievementsModal
        open={open}
        onOpenChange={onOpenChange}
        achievements={achievements}
        state={state}
      />
    </>
  );
}
