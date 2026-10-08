'use client';

/**
 * UpgradeRow + UpgradeButton — presentational pieces for the Upgrades panel.
 *
 * Extracted so they can be reused / composed and linted independently. The
 * button uses shadcn/ui Button + Tooltip; the row uses a card-like layout
 * with a left category color stripe, level badge, effect line, and CTA.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatNumber } from '@/lib/game/format';
import type { UpgradeDefinition, UpgradeCategory } from '@/lib/game/types';
import { cn } from '@/lib/utils';

const CATEGORY_TINTS: Record<UpgradeCategory, string> = {
  performance: 'bg-pink-500',
  marketing: 'bg-amber-500',
  training: 'bg-purple-500',
  lifestyle: 'bg-teal-500',
};

const CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  performance: 'Performance',
  marketing: 'Marketing',
  training: 'Training',
  lifestyle: 'Lifestyle',
};

interface UpgradeRowProps {
  def: UpgradeDefinition;
  level: number;
  buyQty: number;
  cost: number;
  canAfford: boolean;
  isMax: boolean;
  onBuy: () => void;
}

export function UpgradeRow({
  def,
  level,
  buyQty,
  cost,
  canAfford,
  isMax,
  onBuy,
}: UpgradeRowProps) {
  const nextLevel = Math.min(level + 1, def.max_level);
  const effectAtCurrent = def.effect_description_fn?.(level) ?? `+${level}`;
  const effectAtNext = def.effect_description_fn?.(nextLevel) ?? `+${nextLevel}`;
  return (
    <div
      className={cn(
        'relative flex items-start gap-3 rounded-lg border border-border/60 bg-card/70 p-3 transition-colors',
        canAfford && !isMax && 'hover:border-primary/60 hover:bg-card',
        isMax && 'opacity-60',
      )}
    >
      {/* category color stripe */}
      <span
        className={cn('mt-1 h-8 w-1 shrink-0 rounded-full', CATEGORY_TINTS[def.category])}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-bold">{def.display_name}</h4>
          <Badge variant="secondary" className="font-mono text-[10px]">
            Lvl {level}/{def.max_level}
          </Badge>
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {CATEGORY_LABELS[def.category]}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{def.description}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px] font-mono">
          <span className="text-foreground/70">Now: <span className="font-semibold text-foreground">{effectAtCurrent}</span></span>
          <span className="text-muted-foreground">→</span>
          <span className="text-primary">Next: {effectAtNext}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <UpgradeButton
          canAfford={canAfford}
          isMax={isMax}
          buyQty={buyQty}
          cost={cost}
          onClick={onBuy}
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-[9px] text-muted-foreground underline decoration-dotted">
                math
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-[260px]">
              <p className="text-[10px] font-mono">
                cost(L) = {formatNumber(def.base_cost)} × {def.cost_growth.toFixed(2)}^L
              </p>
              <p className="text-[10px] font-mono">
                buying ×{buyQty} @ L{level} = {formatNumber(cost)} cash
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

interface UpgradeButtonProps {
  canAfford: boolean;
  isMax: boolean;
  buyQty: number;
  cost: number;
  onClick: () => void;
}

export function UpgradeButton({ canAfford, isMax, buyQty, cost, onClick }: UpgradeButtonProps) {
  if (isMax) {
    return (
      <Button size="sm" variant="secondary" disabled className="h-7 px-2 text-[11px]">
        MAXED
      </Button>
    );
  }
  return (
    <Button
      size="sm"
      variant={canAfford ? 'default' : 'secondary'}
      disabled={!canAfford}
      onClick={onClick}
      className="h-7 px-2 text-[11px] font-mono"
    >
      Buy ×{buyQty} · ${formatNumber(cost)}
    </Button>
  );
}
