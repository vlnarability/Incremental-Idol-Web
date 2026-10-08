'use client';

/**
 * SaveSlotsModal — multi-slot save manager accessible via a Save icon in the
 * ResourceBar. Shows 3 save slots with preview info (fans, cash, last saved,
 * total clicks). Each slot supports: Switch (load), Delete (with confirm),
 * Export (copy base64 to clipboard), Import (paste base64).
 *
 * Per the brief §3: "At least three save slots, plus a way to export or back
 * up a save."
 */

import { useState } from 'react';
import { Save, Trash2, Download, Upload, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { listSlots, SAVE_SLOT_COUNT } from '@/lib/game/save';
import { formatNumber, formatDuration } from '@/lib/game/format';
import { cn } from '@/lib/utils';

interface SaveSlotsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeSlot: number;
  onSwitchSlot: (slot: number) => void;
  onDeleteSlot: (slot: number) => void;
  onExport: () => string;
  onImport: (encoded: string, slot: number) => boolean;
}

export function SaveSlotsModal({
  open,
  onOpenChange,
  activeSlot,
  onSwitchSlot,
  onDeleteSlot,
  onExport,
  onImport,
}: SaveSlotsModalProps) {
  const [slots, setSlots] = useState(() => listSlots());
  const [importingSlot, setImportingSlot] = useState<number | null>(null);
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [exportedSlot, setExportedSlot] = useState<number | null>(null);

  // Refresh slot list when modal opens.
  const refreshSlots = () => setSlots(listSlots());

  const handleOpenChange = (open: boolean) => {
    if (open) refreshSlots();
    onOpenChange(open);
  };

  const handleSwitch = (slot: number) => {
    onSwitchSlot(slot);
    refreshSlots();
    onOpenChange(false);
  };

  const handleDelete = (slot: number) => {
    if (window.confirm(`Delete save in slot ${slot}? This cannot be undone.`)) {
      onDeleteSlot(slot);
      refreshSlots();
    }
  };

  const handleExport = (slot: number) => {
    if (slot !== activeSlot) {
      // Can only export the active slot (the hook holds the live state).
      // For other slots, we'd need to load them first. For simplicity,
      // only export the active slot.
      window.alert('Switch to this slot first, then export.');
      return;
    }
    const encoded = onExport();
    // Copy to clipboard
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(encoded);
      setExportedSlot(slot);
      window.setTimeout(() => setExportedSlot(null), 2000);
    } else {
      // Fallback: show in a prompt
      window.prompt('Copy this save code:', encoded);
    }
  };

  const handleImport = (slot: number) => {
    if (!importText.trim()) {
      setImportStatus('error');
      return;
    }
    const success = onImport(importText.trim(), slot);
    if (success) {
      setImportStatus('success');
      setImportText('');
      setImportingSlot(null);
      refreshSlots();
      window.setTimeout(() => setImportStatus('idle'), 2000);
    } else {
      setImportStatus('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg border-2 border-primary/40 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-primary">
            <Save className="h-5 w-5" />
            Save Slots
          </DialogTitle>
          <DialogDescription>
            3 save slots. Active slot: <strong>{activeSlot}</strong>. Switch to load a different game.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {slots.map((slot) => {
            const isActive = slot.slot === activeSlot;
            return (
              <div
                key={slot.slot}
                className={cn(
                  'rounded-lg border p-3',
                  isActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border/60 bg-background/60',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">Slot {slot.slot}</span>
                    {isActive && (
                      <Badge className="bg-primary text-primary-foreground text-[9px]">ACTIVE</Badge>
                    )}
                    {slot.exists ? (
                      <Badge variant="secondary" className="text-[9px]">
                        {formatDuration(Date.now() - slot.last_saved_at)} ago
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px]">EMPTY</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant={isActive ? 'secondary' : 'default'}
                      disabled={isActive}
                      onClick={() => handleSwitch(slot.slot)}
                      className="h-7 px-2 text-[10px]"
                    >
                      {isActive ? 'Active' : 'Switch'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExport(slot.slot)}
                      disabled={!slot.exists}
                      className="h-7 w-7 p-0"
                      aria-label={`Export slot ${slot.slot}`}
                    >
                      {exportedSlot === slot.slot ? (
                        <Check className="h-3 w-3 text-teal-500" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setImportingSlot(importingSlot === slot.slot ? null : slot.slot)}
                      className="h-7 w-7 p-0"
                      aria-label={`Import to slot ${slot.slot}`}
                    >
                      <Upload className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(slot.slot)}
                      disabled={!slot.exists || isActive}
                      className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Delete slot ${slot.slot}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {slot.exists && (
                  <div className="mt-1.5 grid grid-cols-3 gap-2 text-[10px]">
                    <div className="rounded bg-muted/40 px-1.5 py-0.5">
                      <span className="text-muted-foreground">Fans: </span>
                      <span className="font-mono font-bold text-pink-600 dark:text-pink-300">
                        {formatNumber(slot.fans)}
                      </span>
                    </div>
                    <div className="rounded bg-muted/40 px-1.5 py-0.5">
                      <span className="text-muted-foreground">Cash: </span>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-300">
                        {formatNumber(slot.cash)}
                      </span>
                    </div>
                    <div className="rounded bg-muted/40 px-1.5 py-0.5">
                      <span className="text-muted-foreground">Clicks: </span>
                      <span className="font-mono font-bold">
                        {formatNumber(slot.total_clicks)}
                      </span>
                    </div>
                  </div>
                )}
                {/* Import textarea (collapsible) */}
                {importingSlot === slot.slot && (
                  <div className="mt-2 space-y-1.5">
                    <Textarea
                      value={importText}
                      onChange={(e) => {
                        setImportText(e.target.value);
                        setImportStatus('idle');
                      }}
                      placeholder={`Paste a save code to import into slot ${slot.slot}...`}
                      className="h-16 font-mono text-[10px]"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleImport(slot.slot)}
                        className="h-7 text-[10px]"
                      >
                        Import to Slot {slot.slot}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setImportingSlot(null);
                          setImportText('');
                          setImportStatus('idle');
                        }}
                        className="h-7 text-[10px]"
                      >
                        Cancel
                      </Button>
                      {importStatus === 'success' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-300">
                          <Check className="h-3 w-3" /> Imported!
                        </span>
                      )}
                      {importStatus === 'error' && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-destructive">
                          <AlertCircle className="h-3 w-3" /> Invalid save code
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {exportedSlot && (
          <div className="rounded-lg border border-teal-500/40 bg-teal-500/10 p-2 text-center text-[11px] font-bold text-teal-600 dark:text-teal-300">
            <Check className="mr-1 inline h-3 w-3" />
            Save code copied to clipboard!
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Save icon button for the ResourceBar. */
export function SaveSlotsButton({
  open,
  onOpenChange,
  activeSlot,
  onSwitchSlot,
  onDeleteSlot,
  onExport,
  onImport,
}: SaveSlotsModalProps) {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onOpenChange(true)}
        className="relative hidden h-7 w-7 border-primary/40 p-0 hover:border-primary/60 sm:inline-flex"
        aria-label={`Save slots (active: ${activeSlot})`}
      >
        <Save className="h-3.5 w-3.5" />
        <span className="absolute -bottom-1 -right-1 flex h-3 min-w-3 items-center justify-center rounded-full bg-secondary px-0.5 font-mono text-[8px] font-bold text-secondary-foreground">
          {activeSlot}
        </span>
      </Button>
      <SaveSlotsModal
        open={open}
        onOpenChange={onOpenChange}
        activeSlot={activeSlot}
        onSwitchSlot={onSwitchSlot}
        onDeleteSlot={onDeleteSlot}
        onExport={onExport}
        onImport={onImport}
      />
    </>
  );
}

export { SAVE_SLOT_COUNT };
