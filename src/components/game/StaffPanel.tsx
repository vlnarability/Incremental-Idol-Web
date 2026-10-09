'use client';

/**
 * StaffPanel — upgrade coaches. Each coach level adds a fixed boost to
 * the TRAINING CLICK AMOUNT for its specific stat (no more passive
 * per-second stat growth). Bulk-buy ×1/×10/×Max.
 *
 * Per stat there is exactly one coach: Vocals / Dance / Charisma / Charm.
 * All coaches share the same base cost ($100) and growth rate (1.15),
 * so players can pick whichever stat they want to train without worrying
 * about cost asymmetries. max_hires is 999999, so upgrades are infinite.
 *
 * Cards show: coach name, current Level, +X per Train click (base 0.5 +
 * coachBonus), and the upgrade cost for the next level (×qty).
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { STAFF, staffHireCost, staffMaxAffordable } from '@/lib/game/engine';
import { formatNumber } from '@/lib/game/format';
import type { GameState, StaffDefinition } from '@/lib/game/types';
import type { GameActions } from '@/hooks/useGameEngine';
import { cn } from '@/lib/utils';

interface StaffPanelProps {
  state: GameState;
  actions: GameActions;
}

type BuyQty = 1 | 10 | 'max';

const ROLE_TINT: Record<StaffDefinition['role'], string> = {
  assistant: 'bg-pink-500',
  coach: 'bg-teal-500',
  producer: 'bg-amber-500',
  booking_agent: 'bg-purple-500',
};

/** Base training click amount (mirrors engine's TRAIN_BASE). */
const TRAIN_BASE = 0.5;

export function StaffPanel({ state, actions }: StaffPanelProps) {
  const [qty, setQty] = useState<BuyQty>(1);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Staff</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Upgrade:</span>
          <ToggleGroup
            type="single"
            value={String(qty)}
            onValueChange={(v) => {
              if (v === '1') setQty(1);
              else if (v === '10') setQty(10);
              else if (v === 'max') setQty('max');
            }}
            className="rounded-md border border-border bg-background/60 p-0.5"
            aria-label="Bulk-upgrade quantity"
          >
            <ToggleGroupItem value="1" className="h-6 px-2 text-[10px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              ×1
            </ToggleGroupItem>
            <ToggleGroupItem value="10" className="h-6 px-2 text-[10px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              ×10
            </ToggleGroupItem>
            <ToggleGroupItem value="max" className="h-6 px-2 text-[10px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              ×Max
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Each coach level adds +{TRAIN_BASE} to the matching stat per Train click. Coaches no longer passively boost stats.
      </p>

      <div className="idol-scroll -mr-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
        {STAFF.map((def) => {
          const level = state.staff[def.id] ?? 0;
          const buyQty =
            qty === 'max'
              ? Math.max(1, staffMaxAffordable(def, level, state.resources.cash))
              : qty;
          const cost = staffHireCost(def, level, buyQty);
          const canAfford = state.resources.cash >= cost && buyQty > 0;
          const clickBoost = def.train_boost * level;
          // Per-click training amount = TRAIN_BASE + coachBonus
          const perClick = TRAIN_BASE + clickBoost;
          return (
            <div
              key={def.id}
              className={cn(
                'idol-card-hover flex items-start gap-3 rounded-lg border border-border/60 bg-card/70 p-3',
                canAfford && 'hover:border-primary/60',
              )}
            >
              <span className={cn('mt-1 h-8 w-1 shrink-0 rounded-full', ROLE_TINT[def.role])} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-sm font-bold">{def.name}</h4>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    Level {formatNumber(level)}
                  </Badge>
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {def.stat}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{def.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-mono">
                  <span className="text-teal-600 dark:text-teal-300">
                    +{perClick.toFixed(2)} per Train click
                  </span>
                  {level > 0 && (
                    <span className="text-muted-foreground">
                      (base {TRAIN_BASE.toFixed(1)} + coach {clickBoost.toFixed(1)})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <Button
                  size="sm"
                  variant={canAfford ? 'default' : 'secondary'}
                  disabled={!canAfford}
                  onClick={() => actions.hireStaff(def.id, buyQty)}
                  className="h-7 px-2 text-[11px] font-mono"
                >
                  Upgrade ×{buyQty} · ${formatNumber(cost)}
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help text-[9px] text-muted-foreground underline decoration-dotted">
                        math
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[260px]">
                      <p className="text-[10px] font-mono">
                        cost(n) = {formatNumber(def.base_cost_cash)} × {def.cost_growth.toFixed(2)}^n
                      </p>
                      <p className="text-[10px] font-mono">
                        upgrading ×{buyQty} @ level={level} = {formatNumber(cost)} cash
                      </p>
                      <p className="text-[10px] font-mono">
                        each level: +{def.train_boost} to {def.stat} Train click
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
