'use client';

/**
 * UpgradesPanel — list of buyable upgrades with bulk-buy (×1 / ×10 / ×Max).
 * Disabled when unaffordable or at max level. Shows current level, next-level
 * effect, total cost. Tooltips expose the underlying math.
 */

import { useState } from 'react';
import { UpgradeRow } from './UpgradeButton';
import { UPGRADES, upgradeCost, maxAffordable } from '@/lib/game/engine';
import type { GameState } from '@/lib/game/types';
import type { GameActions } from '@/hooks/useGameEngine';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';

interface UpgradesPanelProps {
  state: GameState;
  actions: GameActions;
}

type BuyQty = 1 | 10 | 'max';

export function UpgradesPanel({ state, actions }: UpgradesPanelProps) {
  const [qty, setQty] = useState<BuyQty>(1);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Upgrades</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Buy:</span>
          <ToggleGroup
            type="single"
            value={String(qty)}
            onValueChange={(v) => {
              if (v === '1') setQty(1);
              else if (v === '10') setQty(10);
              else if (v === 'max') setQty('max');
            }}
            className="rounded-md border border-border bg-background/60 p-0.5"
            aria-label="Bulk-buy quantity"
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
      <div className="idol-scroll -mr-2 flex-1 space-y-2 overflow-y-auto pr-2">
        {UPGRADES.map((def) => {
          const level = state.upgrades[def.id] ?? 0;
          const isMax = level >= def.max_level;
          const buyQty =
            qty === 'max' ? Math.max(1, maxAffordable(def, level, state.resources.cash)) : qty;
          const cost = upgradeCost(def, level, buyQty);
          const canAfford = state.resources.cash >= cost && !isMax && buyQty > 0;
          return (
            <UpgradeRow
              key={def.id}
              def={def}
              level={level}
              buyQty={buyQty}
              cost={cost}
              canAfford={canAfford}
              isMax={isMax}
              onBuy={() => actions.buyUpgrade(def.id, buyQty)}
            />
          );
        })}
        {UPGRADES.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">No upgrades available.</p>
        )}
      </div>
    </div>
  );
}
