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

---
Task ID: 5-10 (main orchestrator pass)
Agent: main (orchestrator)
Task: Build the entire UI layer, fix visual issues surfaced by VLM, commit, push, set up recurring cron, write handover.

Work Log:
- Verified engine API exposed by subagent (useGameEngine, engine.ts exports).
- Wrote 11 UI files: icons.tsx, ResourceBar.tsx, ClickStage.tsx, UpgradesPanel.tsx, UpgradeButton.tsx, SongsPanel.tsx, StaffPanel.tsx, VenuesPanel.tsx, PrestigePanel.tsx, OfflineModal.tsx, DebugPanel.tsx, GameShell.tsx.
- Wrote src/app/page.tsx (renders GameShell) and updated src/app/layout.tsx (metadata: title, description, icon).
- Overrode default shadcn theme in globals.css with pink/teal/lavender palette (light + dark), added pixel-art image-rendering, floating-click keyframes, idol-pulse, custom scrollbar.
- Fixed initial module-not-found bug (UpgradesPanel imported from './UpgradeRow' instead of './UpgradeButton').
- First agent-browser pass: page rendered, all 5 tabs functional, click→fans, buy upgrade, release song, hire staff, unlock venue, prestige teaser — all working.
- VLM screenshot critique identified: (1) text overlap on idol portrait, (2) resource +/s rates too small/faded, (3) prestige panel had bottom whitespace.
- Fixes applied: removed absolute-positioned overlap text in ClickStage, made resource rates bolder (text-[11px] font-bold), added roadmap flavor section to PrestigePanel, disabled Next.js devIndicators floating button.
- Second VLM pass confirmed all fixes landed; layout clean on both desktop and mobile (390×844).
- Lint clean (no warnings/errors).
- Committed (sha 60bf3ab619e2c856cb756658b3c74290184eaa67) and pushed to GitHub remote (no token stored in .git/config — token used only in push URL).
- Created recurring 15-min webDevReview cron (job_id 445093) with mandatory task description per system rules.

Stage Summary:
- M2 vertical slice COMPLETE and pushed to GitHub.
- All 10 Priority-1 M2 deliverables from the brief delivered (click, 6 upgrades with bulk-buy, 4 venues, 3 songs with decay, 4 staff types, logistic saturation visible, autosave, offline modal, prestige teaser wired, number formatting, debug panel).
- All 5 priority-1 engine formulas implemented per brief (exponential cost, logistic fan saturation, exponential song decay, prestige log-scaled reward, offline cap with 75% efficiency).
- Sticky-footer rule honored: root wrapper is min-h-screen flex flex-col, footer has mt-auto.
- Self-verification PASSED via agent-browser (all 5 tabs interactable, no runtime errors in dev.log).
- VLM-verified visuals: clean on desktop + mobile, no overlapping text, palette is pink/teal/lavender (no indigo/blue).
- Next phase (Manager era) intentionally NOT started — brief says validate Idol loop first.

---
Task ID: cron-round-1 (recurring webDevReview)
Agent: main (orchestrator)
Task: QA the M2 slice, then add features + styling polish per cron mandatory directives.

Current project status (assessment):
- M2 vertical slice was complete and stable on entry. Dev server running on port 3000, no runtime errors, all 5 tabs functional, save/load working, sticky footer honored.
- No bugs or regressions found in QA via agent-browser.

Goals this round:
1. Add Trends system (brief §3.C / §4 "Trends and market dynamics") — DONE
2. Add click combo system for active-play reward — DONE
3. Styling polish (card hover lifts, animated spotlight, tab transitions, combo animations) — DONE
4. Verify via agent-browser + VLM — DONE

Completed modifications:
- Engine (src/lib/game/engine.ts):
  * Added trend constants: TREND_DURATION_MS=3min, phase boundaries (20/50/80%), phase multipliers (Emerging ×1.25, Growing ×1.6, Mainstream ×2.0, Declining ×0.75).
  * getTrendAt(timestampMs) — pure deterministic trend derivation from timestamp. Cycle = TREND_GENRES.length × TREND_DURATION_MS.
  * getCurrentTrend(state) — convenience wrapper using state.last_saved_at.
  * songProductionRate() + passiveProduction() now apply trend multiplier to songs whose genre matches the active trend.
  * clickPerform(state, comboMult=1) — combo multiplier applied uniformly to all 4 resource gains (70/25/5 split preserved). Clamped to [1, 10] defensively.
- Types (src/lib/game/types.ts):
  * Added TrendPhase, TrendSnapshot, ComboState types.
  * ClickResult gains combo_multiplier + combo_count fields.
- Definitions (src/lib/game/definitions.ts):
  * Added TREND_GENRES = ['Pop', 'J-Pop', 'EDM', 'Pop', 'J-Pop'] (5-slot cycle, Pop weighted heavier).
- Hook (src/hooks/useGameEngine.ts):
  * Combo state tracked in refs (comboCountRef, comboLastClickAtRef) + mirrored to React state at 5Hz.
  * click() computes comboMult from elapsed since last click (1.5s window, +2% per step, max ×2.0 at 50 combo).
  * 10Hz tick resets combo if no click within 1.5s.
  * Hook returns combo: ComboState + trend: TrendSnapshot.
  * clearSave() resets combo state too.
- UI:
  * New TrendWidget.tsx — shows genre, phase icon (Sparkles/TrendingUp/Flame/TrendingDown), multiplier, lifecycle progress bar with phase boundary ticks, time remaining. Phase-colored (purple/teal/pink/amber).
  * ClickStage.tsx — added combo counter chip (purple ≥2, teal ≥10, pink ≥20), SVG combo decay ring, trend mini-badge in header, animated conic spotlight rotation (12s cycle), combo callout in floating text at ≥3 combo.
  * SongsPanel.tsx — TRENDING badge on songs matching active trend, pink border ring on trending cards, live trend-boosted rate display on released songs, trend multiplier shown inline.
  * GameShell.tsx — TrendWidget placed above tabs (always visible), tab content gets animate-tab-slide on switch.
  * UpgradeButton.tsx, StaffPanel.tsx — added idol-card-hover lift utility.
  * globals.css — added idol-spotlight-rotate, combo-pop, idol-card-hover, tab-slide-in keyframes/classes.

Verification results:
- bunx tsc --noEmit: clean (0 errors in src/)
- bun run lint: clean (0 warnings)
- agent-browser QA: page renders, TrendWidget shows "Pop / Emerging / ×1.25 / 2m 44s", combo counter shows "12x · ×1.24" after rapid clicks, TRENDING badge appears on matching songs, all 5 tabs functional.
- VLM screenshot critique: 8/10 polish. Trend widget clearly visible, layout balanced, combo counter visible. Minor issues: flat UI vs pixel-art contrast (intentional), low-contrast secondary text (acceptable for prototype).
- Committed (sha 09d6c7e) and pushed to GitHub.

Unresolved issues / risks:
- Trend multiplier in passiveProduction uses the trend at window start. For 100ms ticks this is exact; for multi-hour offline catch-up the trend may rotate mid-window (cycle=3min, cap=8h ⇒ up to 160 rotations), introducing bounded error. Documented in engine comment; acceptable for M2.
- Combo decay ring (SVG) may be too subtle — VLM didn't see it in one screenshot. Could boost stroke width or opacity in a future round.
- The "flat UI vs pixel-art" aesthetic clash noted by VLM is intentional for the prototype — the Godot version will have full pixel-art UI.

Priority recommendations for next phase:
1. Balance pass: tune click values, upgrade costs, and staff production so the early-game pacing feels right (currently ~1000 clicks to saturate Local Bar without upgrades).
2. Add active events / random opportunities (viral moment, endorsement offer, scandal) per brief §4 "Controversy and scandals" — would add risk/reward decisions.
3. More pixel-art sprites: multiple idol portraits, venue backgrounds, staff icons.
4. Manager era prototype (Era II): roster of multiple idols, training schedules, contracts — the brief says validate Idol loop first, which is now done.
5. Event log / notification feed: surface trend changes, milestone reaches, and combo achievements.

---
Task ID: cron-round-2 (recurring webDevReview)
Agent: main (orchestrator)
Task: QA the trends+combo M2 slice, then add Active Events + balance fix + styling polish per cron mandatory directives.

Current project status (assessment):
- Trends + combo systems (from round 1) were stable on entry. Dev server running, no runtime errors, all 5 tabs functional, save/load working.
- Spotted a balance issue: 21K fans at Local Bar but player couldn't unlock Small Club (needs 2 rep) because Local Bar gave 0 rep/click — required grinding 1000+ clicks for a Coach first. Fixed this round.

Goals this round:
1. Add Active Events system (brief §4 "Controversy and scandals", "Rival idols") — DONE
2. Balance fix: Local Bar rep/click, Small Club rep requirement — DONE
3. Event log panel showing recent outcomes — DONE
4. Styling polish: themed event modal, effect chips, countdown bar — DONE

Completed modifications:
- Types (src/lib/game/types.ts):
  * Added EventChoice, EventDefinition, ActiveEvent, EventLogEntry interfaces.
  * GameState gains: active_event (ActiveEvent | null), last_event_spawned_at (number), event_log (EventLogEntry[]).
- Definitions (src/lib/game/definitions.ts):
  * Added EVENTS array — 5 event types: Viral Moment (pink), Endorsement Offer (amber), Tabloid Rumor (purple), Collab Offer (teal), Stroke of Inspiration (teal). Each has 2 choices with resource effects and outcome_text.
  * Added getEventDef helper.
  * Balance fix: Local Bar base_reward_rep 0 → 0.005 (tiny rep per click so players can bootstrap). Small Club rep_requirement 2 → 1.
- Engine (src/lib/game/engine.ts):
  * Constants: EVENT_SPAWN_INTERVAL_MS=90s, EVENT_DURATION_MS=60s, EVENT_LOG_MAX=20.
  * pickEventAt(timestampMs) — deterministic event cycle: floor(t / 90s) % EVENTS.length.
  * spawnEventIfNeeded(state, nowMs) — spawns new event if interval elapsed + no active event; expires active event if past expires_at (logs as "Expired").
  * resolveEvent(state, choiceId) — applies choice effects (clamped at 0), records EventLogEntry, clears active_event.
  * tick() now calls spawnEventIfNeeded after advancing clock.
  * applyOffline() clears active_event + resets last_event_spawned_at to nowMs (player wasn't present to resolve).
  * cloneState deep-clones active_event (with choice effects spread) + event_log.
- Save (src/lib/game/save.ts):
  * Permissive loader fills defaults for new event fields on old saves: active_event=null, last_event_spawned_at=last_saved_at (or now), event_log=[].
- Hook (src/hooks/useGameEngine.ts):
  * Exposes activeEvent + eventLog in the return.
  * New action: resolveEvent(choiceId).
  * New debug action: debugForceEvent() — sets last_event_spawned_at=0 + clears active_event so next tick spawns immediately.
- UI:
  * New EventModal.tsx — themed modal (pink/amber/teal/purple) with: countdown progress bar (200ms live tick), event icon + name + description, choice buttons with color-coded effect chips (Heart=fans, DollarSign=cash, Star=rep, Zap=XP). No close button — must pick a choice.
  * New EventLog.tsx — compact panel in footer with Bell icon, entry count badge, scrollable list (max-h-32) showing: colored dot, event name, choice label (primary color), outcome text, relative timestamp. Empty state: "Events spawn every ~90s."
  * GameShell.tsx — EventLog placed above DebugPanel in footer (always visible). EventModal rendered last (on top of everything).
  * DebugPanel.tsx — new "Spawn event" button (4th debug section, grid changed from 3→4 cols).

Verification results:
- bunx tsc --noEmit: clean (0 errors in src/).
- bun run lint: clean.
- agent-browser QA: forced event spawn via debug button → Collab Offer modal appeared with 2 choices + effect chips + countdown bar. Clicked "Accept the feature" → modal closed, EventLog showed "Collab Offer → Accept the feature → The track drops next month. Hype builds. → 1s ago" with count badge "1".
- VLM critique: event modal confirmed "visually polished with frosted-glass effect, teal border, cohesive color palette". Event log confirmed "clearly visible with all details: event name, choice, outcome, timestamp, notification badge".
- Committed (sha 44f207a) and pushed to GitHub.

Unresolved issues / risks:
- Events don't spawn during offline catch-up (applyOffline clears active_event + resets spawn clock). This is intentional — the player must be present to make choices. Documented in engine comments.
- Event spawn schedule is fully deterministic (floor(t/90s) % EVENTS.length) — a player who knows the cycle can predict what's coming. This is a feature (strategic depth) not a bug, per brief §3.C "Trendsetter can generate enormous returns".
- The 5 events will eventually feel repetitive. A future round should add more event types or randomize within the deterministic cycle (e.g. deterministic slot picks from a larger pool via seeded hash).
- Event effects are flat numbers (+800 fans, +1500 cash) — they don't scale with player progression. At 21K fans, +800 is negligible; at 100 fans, +800 is game-changing. A future round should scale effects by current resource levels or venue tier.

Priority recommendations for next phase:
1. Scale event effects by player progression (venue tier or current fans) so they stay relevant throughout the game.
2. Add more event types (10-15) and/or event categories (rival idols, fan mail, industry gossip, trend forecasts).
3. Add visual feedback when an event spawns (toast notification + stage pulse) so the player notices even if they're in a different tab.
4. Balance pass: monitor whether the Local Bar rep/click fix makes early-game flow feel right. May need to also reduce first upgrade cost from 25 to 15.
5. Manager era prototype (Era II) — the Idol loop is now well-validated with trends, combo, and events adding decision depth. Time to start the roster-management layer.
