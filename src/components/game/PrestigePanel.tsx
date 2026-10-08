'use client';

/**
 * PrestigePanel — shows the progression ladder and prestige button.
 * Level 1: Solo Idol → Level 2: Group Center → Level 3: Agency Manager.
 *
 * Preserves: STAR FACTOR (never resets), idol_stats (stays until you prestige
 * out of performing), chosen_archetype.
 * Resets: resources, energy, week, upgrades, staff, venues, songs, events.
 */

import { Trophy, Lock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/lib/game/format';
import { PROGRESSION_LABELS, PROGRESSION_REQUIREMENTS } from '@/lib/game/engine';
import { cn } from '@/lib/utils';
import type { GameState } from '@/lib/game/types';

interface PrestigePanelProps {
  state: GameState;
  progressionInfo: {
    canPrestige: boolean;
    currentLevel: number;
    currentLabel: string;
    nextLabel: string | null;
    requirement: { fans: number; fame: number; week: number } | null;
  };
  onPrestige: () => void;
}

export function PrestigePanel({ state, progressionInfo, onPrestige }: PrestigePanelProps) {
  const { canPrestige, currentLevel, currentLabel, nextLabel, requirement } = progressionInfo;
  const fansPct = requirement ? Math.min(100, (state.resources.fans / requirement.fans) * 100) : 0;
  const famePct = requirement ? Math.min(100, (state.resources.fame / requirement.fame) * 100) : 0;
  const weekPct = requirement ? Math.min(100, (state.week / requirement.week) * 100) : 0;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Progression</h3>
        <Badge variant="secondary" className="text-[9px]">
          Lv {currentLevel} · {currentLabel}
        </Badge>
      </div>

      {/* Progression ladder */}
      <div className="space-y-1.5">
        {Object.entries(PROGRESSION_LABELS).map(([level, label]) => {
          const lv = parseInt(level);
          const isCurrent = lv === currentLevel;
          const isPast = lv < currentLevel;
          const isLocked = lv > currentLevel && !canPrestige;
          const isNext = lv === currentLevel + 1;
          return (
            <div
              key={level}
              className={cn(
                'flex items-center gap-2 rounded-lg border p-2',
                isCurrent ? 'border-primary bg-primary/5' : 'border-border/40 bg-muted/20',
                isPast && 'opacity-50',
              )}
            >
              {isPast ? <Trophy className="h-3 w-3 text-amber-500" /> :
               isCurrent ? <span className="text-primary">●</span> :
               isLocked ? <Lock className="h-3 w-3 text-muted-foreground" /> :
               <ChevronRight className="h-3 w-3 text-teal-500" />}
              <span className={cn('text-[10px] font-bold', isCurrent && 'text-primary')}>
                {label}
              </span>
              {isNext && <Badge className="ml-auto bg-teal-500 text-white text-[8px]">NEXT</Badge>}
              {isCurrent && <Badge className="ml-auto bg-primary text-primary-foreground text-[8px]">YOU</Badge>}
            </div>
          );
        })}
      </div>

      {/* Requirements for next level */}
      {requirement && nextLabel ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="mb-2 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Prestige to become: {nextLabel}
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                <span>Fans</span>
                <span className="font-mono">{formatNumber(state.resources.fans)} / {formatNumber(requirement.fans)}</span>
              </div>
              <Progress value={fansPct} className="mt-0.5 h-1.5" />
            </div>
            <div>
              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                <span>Fame</span>
                <span className="font-mono">{state.resources.fame < 10 ? state.resources.fame.toFixed(1) : formatNumber(state.resources.fame)} / {formatNumber(requirement.fame)}</span>
              </div>
              <Progress value={famePct} className="mt-0.5 h-1.5" />
            </div>
            <div>
              <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                <span>Weeks</span>
                <span className="font-mono">{state.week} / {requirement.week}</span>
              </div>
              <Progress value={weekPct} className="mt-0.5 h-1.5" />
            </div>
          </div>
          <p className="mt-2 text-center text-[9px] text-muted-foreground">
            STAR FACTOR + idol stats are preserved. Everything else resets.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-center">
          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-300">
            🏆 Max progression level reached!
          </span>
        </div>
      )}

      {/* Prestige button */}
      {requirement && (
        <Button
          size="lg"
          variant={canPrestige ? 'default' : 'secondary'}
          disabled={!canPrestige}
          onClick={onPrestige}
          className="mt-auto h-12 w-full font-mono uppercase tracking-wider"
        >
          {canPrestige ? `Prestige → ${nextLabel}` : 'Requirements not met'}
        </Button>
      )}
    </div>
  );
}
