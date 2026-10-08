'use client';

/**
 * TutorialOverlay — shows contextual tips for new players.
 * Reads tutorial_step from state. Shows the current tip at the bottom-center
 * of the screen. The player dismisses each tip by clicking "Got it" or by
 * performing the suggested action (auto-advances).
 *
 * Steps: 0=Click idol, 1=End Week, 2=Train, 3=Hire coach, 4=Release song,
 * 5=Check prestige, 6=Done (overlay disappears).
 */

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TUTORIAL_STEPS, TUTORIAL_MAX_STEP } from '@/lib/game/engine';
import { cn } from '@/lib/utils';

interface TutorialOverlayProps {
  step: number;
  onAdvance: () => void;
  onDismiss: () => void;
}

export function TutorialOverlay({ step, onAdvance, onDismiss }: TutorialOverlayProps) {
  if (step >= TUTORIAL_MAX_STEP) return null;
  const current = TUTORIAL_STEPS[step];
  if (!current) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 px-3" aria-live="polite">
      <div className="flex w-80 max-w-[90vw] items-start gap-3 rounded-xl border-2 border-primary/40 bg-card p-3 shadow-lg">
        <span className="text-2xl" aria-hidden>{current.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              {current.title}
            </span>
            <span className="ml-auto text-[8px] font-mono text-muted-foreground">
              {step + 1}/{TUTORIAL_MAX_STEP}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-foreground/80">
            {current.tip}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Button size="sm" variant="default" onClick={onAdvance} className="h-7 text-[10px]">
              Got it
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss} className="h-7 text-[10px] text-muted-foreground">
              Skip tutorial
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
