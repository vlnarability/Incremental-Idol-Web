'use client';

/**
 * DebugPanel — collapsible footer section exposing the debug helpers per the
 * brief §9: "Add a debug mode that can grant resources, unlock eras,
 * simulate offline time, and jump to milestones."
 *
 * Sticky-footer behaviour is provided by GameShell's flex layout (mt-auto
 * on the footer). This component renders inside that footer.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Bug, FastForward, Gift, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { GameActions } from '@/hooks/useGameEngine';
import type { GameState } from '@/lib/game/types';

interface DebugPanelProps {
  state: GameState;
  actions: GameActions;
}

export function DebugPanel({ state, actions }: DebugPanelProps) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState('60');
  const [grant, setGrant] = useState('1000');

  const handleSimOffline = () => {
    const n = parseInt(minutes, 10);
    if (Number.isFinite(n) && n > 0) actions.simulateOffline(n);
  };
  const handleGrant = () => {
    const n = parseFloat(grant);
    if (!Number.isFinite(n) || n <= 0) return;
    actions.grantResources({ fans: n, cash: n, reputation: n / 100, experience: n / 10 });
  };

  return (
    <div className="border-t border-border/60 bg-card/80 backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/40 sm:px-4"
        aria-expanded={open}
        aria-controls="debug-controls"
      >
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Bug className="h-3 w-3" />
          Debug · session {new Date(state.stats.started_at).toLocaleTimeString()}
        </span>
        <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </button>

      {open && (
        <div
          id="debug-controls"
          className="flex flex-col gap-3 px-3 pb-3 sm:px-4 sm:pb-4"
        >
          <Separator />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <DebugSection
              icon={<Gift className="h-3 w-3" />}
              title="Grant resources"
              subtitle="Add to all four resources at once."
            >
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="grant-amt" className="text-[10px] text-muted-foreground">Amount</Label>
                  <Input
                    id="grant-amt"
                    inputMode="numeric"
                    value={grant}
                    onChange={(e) => setGrant(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>
                <Button size="sm" variant="default" onClick={handleGrant} className="h-8">
                  Grant
                </Button>
              </div>
            </DebugSection>

            <DebugSection
              icon={<FastForward className="h-3 w-3" />}
              title="Simulate offline"
              subtitle="Fast-forward N minutes at full efficiency."
            >
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="sim-min" className="text-[10px] text-muted-foreground">Minutes</Label>
                  <Input
                    id="sim-min"
                    inputMode="numeric"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    className="h-8 font-mono text-xs"
                  />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="secondary" onClick={handleSimOffline} className="h-8">
                        Simulate
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Applies production for N simulated minutes.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </DebugSection>

            <DebugSection
              icon={<Eraser className="h-3 w-3" />}
              title="Reset save"
              subtitle="Wipe localStorage and start fresh."
            >
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (window.confirm('Wipe your save and start a new game? This cannot be undone.')) {
                    actions.clearSave();
                  }
                }}
                className="h-8 w-full"
              >
                Wipe save
              </Button>
            </DebugSection>
          </div>
          <p className="text-[9px] text-muted-foreground">
            Tip: production at the Local Bar caps at 1,000 fans. Unlock bigger venues to raise the ceiling.
            Save version {state.save_version}.
          </p>
        </div>
      )}
    </div>
  );
}

function DebugSection({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/60 p-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <p className="mb-1.5 text-[9px] text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  );
}
