'use client';

/**
 * StaffPanel — hire staff for passive production. Bulk-buy ×1/×10/×Max.
 * Shows count hired, current production rate per role, total per-resource rate.
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
import { STAFF, staffHireCost, staffMaxAffordable, staffProductionRate } from '@/lib/game/engine';
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

export function StaffPanel({ state, actions }: StaffPanelProps) {
  const [qty, setQty] = useState<BuyQty>(1);
  const rates = staffProductionRate(state);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Staff</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Hire:</span>
          <ToggleGroup
            type="single"
            value={String(qty)}
            onValueChange={(v) => {
              if (v === '1') setQty(1);
              else if (v === '10') setQty(10);
              else if (v === 'max') setQty('max');
            }}
            className="rounded-md border border-border bg-background/60 p-0.5"
            aria-label="Bulk-hire quantity"
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

      {/* Total rates summary */}
      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
        <RatePill label="Fans/s" value={rates.fans} tone="text-pink-600 dark:text-pink-300" />
        <RatePill label="Cash/s" value={rates.cash} tone="text-amber-600 dark:text-amber-300" />
        <RatePill label="Fame/s" value={rates.reputation} tone="text-teal-600 dark:text-teal-300" />
      </div>

      <div className="idol-scroll -mr-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-2">
        {STAFF.map((def) => {
          const hired = state.staff[def.id] ?? 0;
          const isMax = hired >= def.max_hires;
          const buyQty =
            qty === 'max'
              ? Math.max(1, staffMaxAffordable(def, hired, state.resources.cash))
              : qty;
          const cost = staffHireCost(def, hired, buyQty);
          const canAfford = state.resources.cash >= cost && !isMax && buyQty > 0;
          return (
            <div
              key={def.id}
              className={cn(
                'idol-card-hover flex items-start gap-3 rounded-lg border border-border/60 bg-card/70 p-3',
                canAfford && 'hover:border-primary/60',
                isMax && 'opacity-60',
              )}
            >
              <span className={cn('mt-1 h-8 w-1 shrink-0 rounded-full', ROLE_TINT[def.role])} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-sm font-bold">{def.name}</h4>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {hired}/{def.max_hires}
                  </Badge>
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {def.role.replace('_', ' ')}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{def.description}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-mono">
                  {def.base_production_fans > 0 && (
                    <span className="text-pink-600 dark:text-pink-300">
                      +{formatNumber(def.base_production_fans)} fans/min
                    </span>
                  )}
                  {def.base_production_cash > 0 && (
                    <span className="text-amber-600 dark:text-amber-300">
                      +{formatNumber(def.base_production_cash)} cash/min
                    </span>
                  )}
                  {def.base_production_fame > 0 && (
                    <span className="text-teal-600 dark:text-teal-300">
                      +{formatNumber(def.base_production_fame)} fame/min
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
                  Hire ×{buyQty} · ${formatNumber(cost)}
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
                        hiring ×{buyQty} @ n={hired} = {formatNumber(cost)} cash
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

function RatePill({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 px-2 py-1">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('font-mono text-xs font-bold tabular-nums', tone)}>
        {value > 0 ? `+${formatNumber(value)}` : '0'}
      </div>
    </div>
  );
}
