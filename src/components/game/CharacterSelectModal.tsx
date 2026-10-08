'use client';

/**
 * CharacterSelectModal — shown when the player starts a new game (no
 * chosen_archetype in the save). Displays 8 idol archetypes (4 female,
 * 4 male) in a grid with portraits, names, taglines, and starting stat
 * biases. Clicking one confirms the choice and starts the game.
 *
 * Per the user's design: "at game start you are asked to choose a profile
 * to represent your idol. Give a few options, maybe 4 girls, 4 boys."
 */

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ARCHETYPES, type IdolArchetype } from '@/lib/game/idols';
import { cn } from '@/lib/utils';

interface CharacterSelectModalProps {
  open: boolean;
  onSelect: (archetypeId: string) => void;
}

const TINT_BORDER: Record<IdolArchetype['tint'], string> = {
  pink: 'border-pink-500/60 hover:border-pink-500',
  amber: 'border-amber-500/60 hover:border-amber-500',
  teal: 'border-teal-500/60 hover:border-teal-500',
  purple: 'border-purple-500/60 hover:border-purple-500',
};

const TINT_SELECTED: Record<IdolArchetype['tint'], string> = {
  pink: 'border-pink-500 bg-card ring-2 ring-pink-500/40',
  amber: 'border-amber-500 bg-card ring-2 ring-amber-500/40',
  teal: 'border-teal-500 bg-card ring-2 ring-teal-500/40',
  purple: 'border-purple-500 bg-card ring-2 ring-purple-500/40',
};

export function CharacterSelectModal({ open, onSelect }: CharacterSelectModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const females = ARCHETYPES.filter((a) => a.gender === 'female');
  const males = ARCHETYPES.filter((a) => a.gender === 'male');

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* can't close without choosing */ }}>
      <DialogContent className="max-w-2xl border-2 border-primary/40 bg-card p-0" showCloseButton={false}>
        <DialogHeader className="px-6 pt-5">
          <DialogTitle className="text-center text-xl font-bold text-primary">
            Choose Your Idol
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            This is your character forever. Each archetype has unique starting stats and a distinct visual style.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2">
          {/* Female archetypes */}
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-300">
            Female Idols
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {females.map((arch) => (
              <ArchetypeCard
                key={arch.id}
                arch={arch}
                isSelected={selected === arch.id}
                onSelect={() => setSelected(arch.id)}
              />
            ))}
          </div>

          {/* Male archetypes */}
          <div className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-300">
            Male Idols
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {males.map((arch) => (
              <ArchetypeCard
                key={arch.id}
                arch={arch}
                isSelected={selected === arch.id}
                onSelect={() => setSelected(arch.id)}
              />
            ))}
          </div>
        </div>

        {/* Confirm button */}
        <div className="px-6 pb-5 pt-2">
          <Button
            size="lg"
            variant="default"
            disabled={!selected}
            onClick={handleConfirm}
            className="w-full font-mono uppercase tracking-wider"
          >
            {selected
              ? `Start as ${ARCHETYPES.find((a) => a.id === selected)?.name}`
              : 'Select an idol to begin'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ArchetypeCard({
  arch,
  isSelected,
  onSelect,
}: {
  arch: IdolArchetype;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex flex-col items-center rounded-lg border-2 p-2 transition-all',
        isSelected ? TINT_SELECTED[arch.tint] : TINT_BORDER[arch.tint],
      )}
      aria-label={`Select ${arch.name}`}
    >
      <div className="relative h-20 w-20 overflow-hidden rounded-lg">
        <Image
          src={arch.portrait}
          alt={arch.name}
          fill
          className="pixel-art object-cover"
          sizes="80px"
          priority={false}
        />
      </div>
      <span className="mt-1 text-base" aria-hidden>{arch.icon}</span>
      <span className="text-center text-[10px] font-bold leading-tight">{arch.name}</span>
      <span className="mt-0.5 text-center text-[8px] italic leading-tight text-muted-foreground line-clamp-2">{arch.tagline}</span>
    </button>
  );
}
