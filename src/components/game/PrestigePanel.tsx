'use client';

/**
 * PrestigePanel — LOCKED teaser for the first prestige (Idol → Manager).
 * Reads prestigeInfo (computed by the hook from state). Shows requirement
 * progress and the Legacy-points reward preview, but no action is wired.
 *
 * This is intentional: the M2 vertical slice is meant to *validate the loop*
 * before the Manager era is built. Per the design brief: "render a LOCKED
 * teaser that reads prestigeInfo — can_prestige and reward_preview are
 * display-only; even when true, no callback is wired."
 */

import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatNumber } from '@/lib/game/format';
import type { GameState, PrestigeInfo } from '@/lib/game/types';
import { cn } from '@/lib/utils';

interface PrestigePanelProps {
  state: GameState;
  prestigeInfo: PrestigeInfo;
}

// Mirrors engine.canPrestige / getPrestigeInfo — kept here for display only.
const FANS_GOAL = 1_000_000;
const REP_GOAL = 100;

export function PrestigePanel({ state, prestigeInfo }: PrestigePanelProps) {
  const fansPct = Math.min(100, (state.resources.fans / FANS_GOAL) * 100);
  const repPct = Math.min(100, (state.resources.reputation / REP_GOAL) * 100);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Prestige — Era II</h3>
        <Badge variant="outline" className="text-[9px] uppercase">
          <Lock className="mr-1 h-3 w-3" /> Locked
        </Badge>
      </div>

      <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4">
        <h4 className="text-center text-base font-bold text-primary">Establish Management Company</h4>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          Sign a management deal and become an <strong>Idol Manager</strong>. Recruit a roster,
          assign schedules, automate. Your current idol becomes a contracted superstar who
          continues producing value passively.
        </p>
        <p className="mt-2 text-center text-[10px] italic text-muted-foreground">
          (Manager era is intentionally out-of-scope for this M2 vertical slice.)
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Fans milestone</span>
            <span className="font-mono">{formatNumber(state.resources.fans)} / {formatNumber(FANS_GOAL)}</span>
          </div>
          <Progress value={fansPct} className="h-2" />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Reputation milestone</span>
            <span className="font-mono">{formatNumber(state.resources.reputation)} / {formatNumber(REP_GOAL)}</span>
          </div>
          <Progress value={repPct} className="h-2" />
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-background/60 p-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Legacy on prestige</span>
          <span className={cn('font-mono font-bold', prestigeInfo.reward_preview > 0 ? 'text-primary' : 'text-muted-foreground')}>
            +{formatNumber(prestigeInfo.reward_preview)} LP
          </span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="mt-1 cursor-help text-[10px] text-muted-foreground underline decoration-dotted">
                How is this calculated?
              </p>
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px]">
              <p className="font-mono text-[10px]">
                reward = ⌊2·log₁₀(1 + fans/10k) + 1·log₁₀(1 + rep/10)⌋
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Log-scaled to prevent farming by idling indefinitely.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Button
        size="lg"
        variant="secondary"
        disabled
        className="mt-auto h-12 w-full font-mono uppercase tracking-wider"
        aria-label="Prestige (locked)"
      >
        <Lock className="mr-2 h-4 w-4" />
        {prestigeInfo.can_prestige
          ? 'Prestige locked in M2 prototype'
          : 'Requirements not met'}
      </Button>
      <p className="text-center text-[10px] text-muted-foreground">
        {prestigeInfo.current_requirement}
      </p>

      {/* Flavor / roadmap teaser */}
      <div className="mt-3 rounded-lg border border-dashed border-border/50 bg-muted/30 p-3">
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Beyond Era II — eventual roadmap
        </h5>
        <ul className="mt-1.5 space-y-1 text-[10px] text-muted-foreground">
          <li><strong className="text-foreground/80">Era III · Agency</strong> — operate labels &amp; divisions, acquire competitors.</li>
          <li><strong className="text-foreground/80">Era IV · Conglomerate</strong> — own streaming platforms &amp; shape trends.</li>
          <li><strong className="text-foreground/80">Era V · Cultural Hegemon</strong> — influence nations &amp; institutions.</li>
          <li><strong className="text-foreground/80">Era VI+ · Interplanetary → Galactic → Universal</strong> — fame becomes a property of reality itself.</li>
        </ul>
        <p className="mt-2 text-[9px] italic text-muted-foreground">
          These later eras are intentionally out-of-scope for the M2 prototype — they will be built
          in Godot 4.x after the core loop is validated here.
        </p>
      </div>
    </div>
  );
}
