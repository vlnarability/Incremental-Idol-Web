'use client';

/**
 * SettingsModal — player-tunable settings accessible via a gear icon in the
 * ResourceBar. Controls: simulation speed (0.5×–3×), offline cap (1/4/8/12h),
 * sound toggle.
 *
 * Per the brief §8: "A premium game also benefits from letting players
 * configure automation, disable repetitive notifications, and review exactly
 * why their income is increasing or decreasing. Transparency is particularly
 * important once several layers of multipliers interact."
 */

import { Settings2, Gauge, Clock, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { GameState } from '@/lib/game/types';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: GameState;
  onUpdate: (patch: Partial<GameState['settings']>) => void;
}

const OFFLINE_CAP_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '4', label: '4 hours' },
  { value: '8', label: '8 hours (default)' },
  { value: '12', label: '12 hours' },
];

export function SettingsModal({ open, onOpenChange, state, onUpdate }: SettingsModalProps) {
  const { settings } = state;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-2 border-primary/40 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-primary">
            <Settings2 className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            Tune the game to your play style. Changes save automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Sim speed slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-xs font-semibold">
                <Gauge className="h-3.5 w-3.5 text-teal-500" />
                Simulation Speed
              </Label>
              <span className="font-mono text-sm font-bold text-teal-600 dark:text-teal-300">
                {settings.sim_speed.toFixed(1)}×
              </span>
            </div>
            <Slider
              value={[settings.sim_speed]}
              onValueChange={(vals) => onUpdate({ sim_speed: vals[0] ?? 1 })}
              min={0.5}
              max={3}
              step={0.1}
              className="w-full"
            />
            <p className="text-[10px] text-muted-foreground">
              Controls how fast passive production accrues. 1× = real time, 3× = triple speed, 0.5× = slow motion.
            </p>
          </div>

          {/* Offline cap select */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <Clock className="h-3.5 w-3.5 text-amber-500" />
              Offline Production Cap
            </Label>
            <Select
              value={String(settings.offline_cap_hours)}
              onValueChange={(v) => onUpdate({ offline_cap_hours: parseInt(v, 10) })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OFFLINE_CAP_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Max hours of catch-up production when you return after being away. Production runs at 75% efficiency while offline.
            </p>
          </div>

          {/* Sound toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/60 p-3">
            <div className="flex items-center gap-2">
              {settings.sound_enabled ? (
                <Volume2 className="h-4 w-4 text-teal-500" />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <Label className="text-xs font-semibold">Sound Effects</Label>
                <p className="text-[10px] text-muted-foreground">
                  Currently {settings.sound_enabled ? 'enabled' : 'muted'} (placeholder — audio not yet implemented).
                </p>
              </div>
            </div>
            <Switch
              checked={settings.sound_enabled}
              onCheckedChange={(checked) => onUpdate({ sound_enabled: checked })}
              aria-label="Toggle sound effects"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Gear icon button for the ResourceBar. Renders the trigger + modal. */
export function SettingsButton({
  open,
  onOpenChange,
  state,
  onUpdate,
}: SettingsModalProps) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onOpenChange(true)}
        className={cn('h-7 w-7 border-primary/40 p-0 hover:border-primary/60')}
        aria-label="Open settings"
      >
        <Settings2 className="h-3.5 w-3.5" />
      </Button>
      <SettingsModal open={open} onOpenChange={onOpenChange} state={state} onUpdate={onUpdate} />
    </>
  );
}
