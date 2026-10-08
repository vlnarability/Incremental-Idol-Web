'use client';

/**
 * Idol Idle — Audio Engine
 *
 * A lightweight Web Audio API-based sound system. No audio files needed —
 * all sounds are synthesized at runtime using oscillators + gain envelopes.
 * This keeps the bundle tiny and avoids asset-loading complexity.
 *
 * Sounds:
 * - click: short pink-noise burst with quick decay (performance feedback)
 * - combo_tick: rising-pitch blip per combo step (escalation)
 * - event_spawn: two-note chime (opportunity arriving)
 * - achievement: triumphant 3-note arpeggio (reward)
 * - milestone: soft bell (career moment)
 *
 * Gated by state.settings.sound_enabled. The AudioContext is created lazily
 * on first play (browsers require a user gesture before audio can start).
 */

type SoundKind = 'click' | 'combo_tick' | 'event_spawn' | 'achievement' | 'milestone';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;

  /** Lazily create the AudioContext on first use (browser autoplay policy). */
  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.15; // master volume (quiet by default)
        this.masterGain.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    // Resume if suspended (browsers suspend until user gesture).
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  play(kind: SoundKind): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    switch (kind) {
      case 'click':
        this.playClick(ctx);
        break;
      case 'combo_tick':
        this.playComboTick(ctx);
        break;
      case 'event_spawn':
        this.playEventSpawn(ctx);
        break;
      case 'achievement':
        this.playAchievement(ctx);
        break;
      case 'milestone':
        this.playMilestone(ctx);
        break;
    }
  }

  /** Short pink-noise burst — the "tap" of a performance. */
  private playClick(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  /** Rising-pitch blip — combo escalation. Pitch scales with combo count. */
  playComboTick(_ctx?: unknown, comboCount: number = 1): void {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Pitch rises from 300Hz (combo 1) to ~1200Hz (combo 50), logarithmic.
    const freq = 300 + Math.min(comboCount, 50) * 18;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Two-note chime (E5 → A5) — an opportunity is arriving. */
  private playEventSpawn(ctx: AudioContext): void {
    const now = ctx.currentTime;
    [659.25, 880.0].forEach((freq, i) => {
      const start = now + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.35);
    });
  }

  /** Triumphant 3-note arpeggio (C5 → E5 → G5) — achievement unlocked. */
  private playAchievement(ctx: AudioContext): void {
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const start = now + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.45);
    });
  }

  /** Soft bell (A4) — a career milestone moment. */
  private playMilestone(ctx: AudioContext): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.65);
  }
}

// Singleton — one AudioEngine per browser tab.
let audioEngine: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
  if (!audioEngine) {
    audioEngine = new AudioEngine();
  }
  return audioEngine;
}
