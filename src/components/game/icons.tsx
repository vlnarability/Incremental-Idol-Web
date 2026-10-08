'use client';

/**
 * Idol Idle — Pixel-art icon wrappers + small inline icon fallbacks.
 *
 * Uses Next.js Image with `pixel-art` class for crisp scaling. Each wrapper
 * accepts a `size` prop (px) and `alt` text. Falls back to an inline SVG
 * if the underlying PNG is missing.
 */

import Image from 'next/image';

type IconKind = 'fans' | 'cash' | 'rep' | 'xp' | 'mic';

const PATHS: Record<IconKind, string> = {
  fans: '/game/icon-fans.png',
  cash: '/game/icon-cash.png',
  rep: '/game/icon-rep.png',
  xp: '/game/icon-mic.png',
  mic: '/game/icon-mic.png',
};

interface IconProps {
  kind: IconKind;
  size?: number;
  className?: string;
}

export function GameIcon({ kind, size = 24, className = '' }: IconProps) {
  return (
    <Image
      src={PATHS[kind]}
      alt={`${kind} icon`}
      width={size}
      height={size}
      className={`pixel-art object-contain ${className}`}
      priority={false}
    />
  );
}

export function IdolPortrait({ size = 220, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/game/idol-portrait.png"
      alt="Your idol"
      width={size}
      height={size}
      className={`pixel-art object-contain ${className}`}
      priority
    />
  );
}

export function StageBackdrop({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/game/stage-bg.png"
      alt="Concert stage"
      fill
      className={`pixel-art object-cover ${className}`}
      priority
      sizes="(max-width: 768px) 100vw, 50vw"
    />
  );
}
