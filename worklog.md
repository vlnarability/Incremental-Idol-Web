# Idol Idle — Web Prototype Worklog

Project: Incremental Idol (web-based prototype of the M2 vertical slice)
Target repo: https://github.com/vlnarability/Incremental-Idol-Web
Engine: Next.js 16 + TypeScript + Tailwind + shadcn/ui (web prototype)
Eventual target: Godot 4.x + GDScript for Steam release (separate effort, fed by a design doc generated from this prototype's findings)

## Current Phase
M2 — Idol era vertical slice. Validating core loop: click → resources → exponential upgrades → passive income → first prestige (locked teaser).

## Architecture Decisions
- Simulation layer is pure TypeScript, fully deterministic given (state, action, dt).
- Definitions (upgrades, venues, songs, staff) are static data, separated from runtime state.
- Single autosave slot in localStorage, written on every state mutation + on `beforeunload`.
- Offline catch-up: timestamp-based; capped at 8h default; 75% efficiency; analytical calculation, no per-second loop.
- Tick: 10 Hz sim (100ms), requestAnimationFrame rendering, lastTick catch-up on resume.
- UI: shadcn/ui components, pink/teal/lavender palette (no indigo/blue per system rules), sticky footer.
- Number formatting: compact (K/M/B/T…), full precision in tooltips.

---
Task ID: 1
Agent: main (orchestrator)
Task: Initialize worklog, configure git remote, kick off parallel asset + engine build.

Work Log:
- Verified project state: Next.js 16, shadcn/ui present, no existing game code.
- Created this worklog.
- Added git remote `origin` pointing to the GitHub repo (token embedded only at push-time, NOT stored in `.git/config`).
- Spawned parallel subagents: image generation (Task 2-a) and game engine build (Tasks 3+4).

Stage Summary:
- Foundation ready for parallel build-out.
- Next agents should read this file before starting.

---
Task ID: 2-a
Agent: image-generation (general-purpose)
Task: Generate pixel-art assets for Idol Idle web prototype

Work Log:
- Read worklog.md to absorb project context (kawaii Japanese idol, pixel-art, pink/teal palette, NO indigo/blue).
- Invoked the `image-generation` skill via the Skill tool to load its SKILL.md instructions.
- Verified z-ai CLI is installed at /usr/local/bin/z-ai and supports sizes: 1024x1024, 768x1344, 864x1152, 1344x768, 1152x864, 1440x720, 720x1440.
- Created output directory: /home/z/my-project/public/game/ (Next.js serves files in /public at root path, so assets will be at /game/<file>.png).
- Generated `idol-portrait.png` (1024x1024 square — used as substitute for the requested 512x512 since the SDK's smallest supported square is 1024x1024; UI can downscale via CSS/Next Image width+height).
- Generated `stage-bg.png` (1344x768 — closest supported landscape to the requested 1024x576 / 16:9; 1344x768 is 1.75:1, slight letterboxing or object-fit: cover will be applied in UI).
- Generated `icon-mic.png` (1024x1024 — substitute for requested 128x128; UI downscale).
- Generated `icon-cash.png` (1024x1024 — substitute for requested 64x64; UI downscale).
- Generated `icon-fans.png` (1024x1024 — substitute for requested 64x64; UI downscale).
- Generated `icon-rep.png` (1024x1024 — substitute for requested 64x64; UI downscale).
- All 6 prompts explicitly included "pixel art", "16-bit retro video game style", "kawaii aesthetic", and the appropriate pink/teal/gold color words. Explicit "no blue / no indigo" clauses were added to the stage-bg prompt to enforce the palette constraint.
- Ran the 5 remaining generations in parallel (one bash call per file); all succeeded on first attempt.
- Discovered via `file` that z-ai CLI wrote JPEG-encoded bytes into .png files. Re-encoded all 6 files to true PNG format using the already-installed `sharp` npm package. Verified with `file`: all 6 now report `PNG image data` with correct dimensions.

Stage Summary:
- All 6 required assets successfully generated and re-encoded as valid PNGs in /home/z/my-project/public/game/:
  - /home/z/my-project/public/game/idol-portrait.png  (1024x1024, ~1.4 MB)
  - /home/z/my-project/public/game/stage-bg.png         (1344x768,  ~1.1 MB)
  - /home/z/my-project/public/game/icon-mic.png         (1024x1024, ~373 KB)
  - /home/z/my-project/public/game/icon-cash.png         (1024x1024, ~783 KB)
  - /home/z/my-project/public/game/icon-fans.png         (1024x1024, ~203 KB)
  - /home/z/my-project/public/game/icon-rep.png         (1024x1024, ~370 KB)
- Deviation from spec (sizes): the z-ai-web-dev-sdk only supports 7 fixed sizes (no 512x512, 64x64, or 1024x576). All square assets are 1024x1024 and the landscape background is 1344x768. UI layer should use Next.js `<Image width={} height={} />` or CSS `width/height` to display them at the intended 512/128/64 px. Aspect ratios: icons and portrait are 1:1 (perfect), stage background is 1.75:1 (vs requested 16:9 = 1.78:1; near-identical, `object-fit: cover` recommended).
- No failures. The UI graceful-degradation fallback was not needed, but is still recommended as a defensive measure in case the user wants different art later.
- Prompt-level palette enforcement worked: pink and teal dominate; stage-bg prompt explicitly forbade blue/indigo.

---
Task ID: 3+4
Agent: game-engine (general-purpose)
Task: Build pure-TypeScript simulation engine + React hook for Idol Idle

Work Log:
- Read worklog.md, package.json, tsconfig.json, eslint.config.mjs, and src/app/page.tsx + layout.tsx to ground the build in the existing scaffold (Next.js 16, strict TS, react-hooks lint rule `set-state-in-effect` enabled, no new deps needed).
- Created `src/lib/game/types.ts` with 11 interfaces/enums: ResourceType, UpgradeCategory, StaffRole, Era, Resources, SongInstance, GameStats, Legacy, GameSettings, GameState, UpgradeDefinition, VenueDefinition (with extra `addressable_audience` field used by logistic fan saturation), SongDefinition, StaffDefinition, PrestigeInfo, ClickResult, ProductionDeltas, OfflineSummary.
- Created `src/lib/game/definitions.ts` with the 4 required arrays and lookup helpers:
  - 6 upgrades across 4 categories (Better Microphone [perf, 25, 1.15], Viral Dance [mkt, 80, 1.16], Social Media Push [mkt, 150, 1.17, effect_per_level=2], Vocal Lessons [train, 120, 1.17], Choreography Coach [train, 200, 1.18, effect_per_level=2], Energy Drinks [lifestyle, 50, 1.15]) each with effect_description_fn for tooltips.
  - 4 venues escalating Local Bar (A=1k) → Small Club (A=25k, fans≥250, rep≥2) → Theater (A=250k, fans≥5k, rep≥10) → Stadium (A=1M, fans≥100k, rep≥50).
  - 3 songs (Debut Single Q=1.0/tau=4h, Catching the Vibe Q=2.0/tau=3h, Hypnotic Q=4.0/tau=2h).
  - 4 staff (Assistant→fans, Coach→rep, Producer→cash, Booking Agent→all) with geometric growth 1.15–1.18.
- Created `src/lib/game/format.ts` with formatNumber (compact K/M/B/T/Q, 3 sig figs, integer for <1000, tier-bump at 999.5+ so 999,999 → "1M"), formatRate (/s suffix), formatDuration ("2h 13m" / "45s" / "1d 4h").
- Created `src/lib/game/engine.ts` — all pure functions, immutable, no IO:
  - `cloneState`, `initialState(nowMs=Date.now())`.
  - `upgradeCost` / `maxAffordable` / `staffHireCost` / `staffMaxAffordable` (closed-form geometric series + inverse).
  - `buyUpgrade` / `hireStaff` / `releaseSong` / `unlockVenue` / `setVenue` (validate + clone + mutate + return).
  - `clickPerform` — base_value = venue.base_reward_fans * (1 + 0.1*L_perf) * (1 + 0.05*S_marketing); 70% fans, 25% cash (× venue.base_reward_cash), 5% XP; rep = venue.base_reward_rep × upgradeMult. Returns {state, result} so UI can render floating text.
  - `passiveProduction(state, dtMs)` — staff fans via logistic saturation `R*(1 - fans/A)*dt`, cash/rep unsaturated; songs integrated analytically as `R0*Q*tau*(e^(-t1/tau) - e^(-t2/tau))` with R0=0.5/s, tau in ms.
  - `tick(state, dtMs)` — applies passive production, advances last_saved_at by dtMs, prunes songs older than 10×tau.
  - `addressableAudience`, `staffProductionRate`, `songProductionRate` (UI helpers).
  - `applyOffline(state, nowMs)` — dt=min(nowMs - last_saved_at, cap*1000), 75% efficiency, jumps clock forward to nowMs.
  - `simulateOffline` / `grantResources` (debug).
  - `canPrestige`, `prestigeReward` (`floor(2*log10(1+fans/10k) + log10(1+rep/10))`), `getPrestigeInfo` (LOCKED — display only).
  - Re-exports UPGRADES/VENUES/SONGS/STAFF + lookup helpers so UI can import everything from one path.
- Created `src/lib/game/save.ts` with SAVE_KEY='idol-idle-save-v1', `loadGame` (validates save_version + resources shape, applies defaults for any newer fields, returns {state|null, error|null}), `saveGame` (JSON.stringify, SSR-safe), `clearSave`.
- Created `src/hooks/useGameEngine.ts` ('use client'):
  - Authoritative state in `useRef`, snapshot in `useState` initialized with a deterministic placeholder (last_saved_at=0, all-zero resources) so server and first client render match — no hydration mismatch.
  - Mount effect loads save (or `initialState()`), calls `applyOffline(state, Date.now())`, surfaces an `OfflineSummary` modal only if gap ≥ 60s and at least one resource was gained.
  - 10Hz tick via `setInterval(100ms)` mutates only the ref; `setSnapshot` fires every 2 ticks (5Hz UI) and `persistGame` fires every 50 ticks (5s autosave).
  - User actions (click/buyUpgrade/hireStaff/releaseSong/unlockVenue/setVenue/simulateOffline/grantResources) wrapped in `useCallback`, commit synchronously (ref + snapshot + debounced 500ms autosave), and silently swallow engine throws with a console.warn (UI should pre-validate via `upgradeCost`/`maxAffordable`).
  - `clearSave` action wipes localStorage and re-inits to `initialState()`.
  - `beforeunload` + `visibilitychange` listeners trigger an immediate `persistGame` flush; the cleanup also flushes on unmount.
  - `prestigeInfo` is `useMemo`'d off the snapshot.
  - Returns `{state, actions, offlineSummary, dismissOfflineSummary, prestigeInfo}`.
- Verified with `bunx tsc --noEmit` (zero errors in src/lib/game + src/hooks), `bun run lint` (zero errors after adding an inline `react-hooks/set-state-in-effect` disable for the one-time init `setOfflineSummary` call), and a one-off `bun -e` smoke test confirming: formatNumber boundaries (999,999 → "1M"), upgradeCost closed-form matches manual geometric sum, maxAffordable(1000)=13 and clamps to max_level=50, clickPerform yields {0.7, 0.25, 0.05, base=1} at Local Bar with no upgrades and 1.1×/1.1× after one Better Microphone level, 200 clicks → 140 fans + 50 cash, applyOffline with 5 Assistants for 10 min → 375 fans (= 5×10/min × 10min × 0.75), prestigeReward(1M,100)=5 and (10M,1000)=8.

Stage Summary:
- Files created:
  - `/home/z/my-project/src/lib/game/types.ts`
  - `/home/z/my-project/src/lib/game/definitions.ts`
  - `/home/z/my-project/src/lib/game/format.ts`
  - `/home/z/my-project/src/lib/game/engine.ts`
  - `/home/z/my-project/src/lib/game/save.ts`
  - `/home/z/my-project/src/hooks/useGameEngine.ts`
- Key formulas implemented:
  - Geometric-series upgrade/staff cost: `C0 * r^L * (r^n - 1) / (r - 1)` and inverse `floor(log_r(1 + cash*(r-1)/(C0*r^L)))`.
  - Click value: `base_value = venue.base_reward_fans * (1 + 0.1*L_perf) * (1 + 0.05*S_marketing)`; split 70/25/5; cash additionally × `venue.base_reward_cash`, rep × `venue.base_reward_rep`.
  - Song quality at release: `base_quality * (1 + 0.05 * training_levels)` (training upgrades aggregated with effect_per_level weighting).
  - Lifestyle bonus: `+1% per level` to all staff production.
  - Logistic fan saturation: `delta_fans = R_fans * (1 - fans/addressable_audience) * dt`.
  - Song production integral: `R0 * Q * tau * (e^(-t1/tau) - e^(-t2/tau))` with R0=0.5/s and tau in ms.
  - Offline catch-up: `dt = min(nowMs - last_saved_at, offline_cap_hours * 3.6e6)`, 75% efficiency, clock jumps to nowMs.
  - Prestige reward: `floor(2*log10(1+fans/10000) + log10(1+rep/10))` (LOCKED — display only).
- Known limitations / TODOs for UI agent:
  - The hook returns a deterministic placeholder state for the first render (last_saved_at=0, all-zero resources) so `state` is always non-null. UI should still gracefully handle the brief moment before the mount effect loads the real save (the placeholder will be replaced within a frame). A "loading" splash is optional but not required.
  - `actions.click()` returns a `ClickResult | null` (null only before init) for floating "+X fans" text — use it for click feedback animations.
  - `actions.buyUpgrade` / `hireStaff` / `releaseSong` / `unlockVenue` swallow engine throws silently with a console.warn. UI MUST pre-validate using `engine.upgradeCost(def, currentLevel, qty)`, `engine.maxAffordable(def, currentLevel, cash)`, `engine.staffHireCost`, `engine.staffMaxAffordable`, and direct resource checks before enabling buttons.
  - All definitions and pure helpers can be imported directly from `@/lib/game/engine` (which re-exports `UPGRADES`, `VENUES`, `SONGS`, `STAFF`, `getUpgradeDef`, `getVenueDef`, `getSongDef`, `getStaffDef`, `addressableAudience`, `staffProductionRate`, `songProductionRate`, `getPrestigeInfo`). Formatting helpers are in `@/lib/game/format`. Types are in `@/lib/game/types`.
  - The prestige action is intentionally NOT exposed via `actions` — the prestige button should render a LOCKED teaser that calls `engine.getPrestigeInfo(state)` (or reads `prestigeInfo` from the hook) and shows `can_prestige` + `reward_preview`. Even when `can_prestige` is true, no action is wired up — this is the M2 spec.
  - Sticky footer is the UI agent's responsibility — the hook is view-agnostic.
  - The hook's tick interval uses `setInterval` (not `requestAnimationFrame`), matching the spec's 10Hz / 100ms cadence. Background-tab throttling is handled implicitly via the dt clamp in the tick callback.
  - `state.settings.sim_speed` is respected by the tick (dt × sim_speed) but no UI is provided to change it — the UI agent can wire a settings panel if desired; default is 1.
  - `state.settings.sound_enabled` is persisted but the engine does nothing with it — UI agent owns any sound playback.
  - Save schema version is 1 (`idol-idle-save-v1`). `loadGame` is permissive: it accepts older saves and fills defaults for newer fields. A breaking schema change would bump `SAVE_KEY` to `-v2`.
