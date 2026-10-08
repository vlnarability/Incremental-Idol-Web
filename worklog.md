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

---
Task ID: cron-round-3 (recurring webDevReview)
Agent: main (orchestrator)
Task: QA the events+balance M2 slice, then add Achievements + Toasts + event scaling per cron mandatory directives.

Current project status (assessment):
- Events + balance fix from round 2 were stable on entry. Dev server running, no runtime errors, all tabs functional.
- Trophy button showing "8/13" on existing save (retroactive unlock from prior playtesting state).

Goals this round:
1. Add Achievements system (13 goals with unlock conditions) — DONE
2. Add Toast notification system (achievement unlocks + event spawns) — DONE
3. Scale event effects by venue tier — DONE
4. Styling polish (toast animations, achievements modal, trophy button) — DONE

Completed modifications:
- Types (src/lib/game/types.ts):
  * Added AchievementDefinition interface (id, name, description, icon, progress_fn?, check predicate).
  * Added GameToast interface (id, kind, title, description, icon, tint, queued_at).
  * GameState gains: unlocked_achievements: string[].
- Definitions (src/lib/game/definitions.ts):
  * Added ACHIEVEMENTS array — 13 achievements: First Steps, Going Viral, Local Legend, Superstar, Debut Release, Prolific, First Hire, On Fire (20× combo), Moving Up, Big Stage, Stadium Filler, Decision Maker (5 events), Money Moves (10K cash).
  * Each has icon, description, optional progress_fn, and pure check predicate.
  * Added getAchievementDef helper.
- Engine (src/lib/game/engine.ts):
  * checkAchievements(state) → { state, newly_unlocked } — pure function, O(13) per call.
  * venueEffectMultiplier(state) — venue.unlock_order + 1 (Local Bar 1× → Stadium 4×).
  * resolveEvent now applies effects * venueEffectMultiplier so events stay relevant throughout progression.
  * cloneState deep-clones unlocked_achievements.
  * initialState includes unlocked_achievements: [].
  * Re-exports ACHIEVEMENTS + getAchievementDef.
- Save (src/lib/game/save.ts):
  * Permissive loader fills unlocked_achievements=[] for old saves.
- Hook (src/hooks/useGameEngine.ts):
  * commit() now: (a) detects event spawns (null → event) and queues event toast, (b) calls checkAchievements and queues toast for each newly-unlocked achievement.
  * Tick snapshot block also checks achievements + detects event spawns (covers tick-spawned events).
  * prevActiveEventRef tracks event transitions.
  * queueToast + dismissToast helpers. TOAST_AUTO_DISMISS_MS=4.5s, TOAST_MAX_VISIBLE=4.
  * Exposes: achievements, unlockedAchievements, toasts, dismissToast.
- UI:
  * New GameToaster.tsx — fixed bottom-right, animated slide-in (cubic-bezier overshoot), themed by tint (pink/amber/teal/purple). Click to dismiss.
  * New AchievementsModal.tsx — trophy icon in ResourceBar header, modal showing all 13 achievements with locked (grayscale + progress bar) / unlocked (teal border + UNLOCKED badge) states. Shows X/13 complete + percentage.
  * ResourceBar.tsx — added trophy button (Trophy icon + count badge) in header.
  * GameShell.tsx — renders GameToaster + AchievementsModal.
  * globals.css — added toast-in keyframe (slide-in from right with overshoot).

Verification results:
- bunx tsc --noEmit: clean.
- bun run lint: clean.
- agent-browser QA: trophy button shows "8/13" on existing save (retroactive unlock). Forced event spawn → event toast "Endorsement Offer 💰" appeared alongside event modal. Wiped save + clicked Perform → achievement toast "First Steps 👣 — Perform your very first click" appeared. All 5 tabs functional.
- VLM critique: 8/10 polish. Trophy button clearly visible. Toast notifications confirmed working. Strengths: clean layout, informative cards. Issues: low contrast on secondary text, header slightly cramped.
- Committed (sha b33ca06) and pushed to GitHub.

Unresolved issues / risks:
- Achievement toasts fire retroactively on first tick after loading an old save (8 at once, capped to 4 visible). This is a one-time burst — acceptable for the prototype. A future round could suppress toasts for achievements that were "already unlocked before this session" by comparing against a pre-mount snapshot.
- The "On Fire" achievement (20× combo) checks total_perf_sessions >= 20 && total_clicks >= 20, which is a proxy for "has the player clicked 20 times in a session". This doesn't actually verify a 20× combo was achieved — it just checks the player clicked enough. A proper implementation would track max_combo_achieved in stats, but that requires engine changes (adding a field to GameStats). Noted for a future round.
- Event effects are scaled by venue tier but NOT by player fan count. At 100K fans, +800*4=3200 fans from a Viral Moment is still negligible. A future round could also scale by log(fans) or similar.

Priority recommendations for next phase:
1. Track max_combo_achieved in GameStats so the "On Fire" achievement can check it properly.
2. Scale event effects additionally by log(fans+1) so they stay relevant at high fan counts.
3. Add more event types (rival idols, fan mail, trend forecasts, industry gossip) to add variety.
4. Add a "next venue" progress indicator on the click stage showing how close the player is to unlocking the next venue.
5. Manager era prototype (Era II) — the Idol loop is now very well-validated with trends, combo, events, achievements, and toasts. Time to start the roster-management layer.

---
Task ID: cron-round-4 (recurring webDevReview)
Agent: main (orchestrator)
Task: QA the achievements+toasts M2 slice, then add Settings panel + next-venue indicator + max_combo tracking + log(fans) event scaling.

Current project status (assessment):
- Achievements + toasts from round 3 were stable on entry. Dev server running, no runtime errors, all tabs functional.
- Fresh state from prior testing (4 fans, 1/13 achievements). Trend showed "J-Pop ×1.60" (Growing).

Goals this round:
1. Add Settings panel (sim_speed, offline_cap, sound) — DONE
2. Add next-venue progress indicator on ClickStage — DONE
3. Fix "On Fire" achievement (track max_combo_achieved) — DONE
4. Scale event effects by log(fans) — DONE
5. Styling polish (venue indicator, settings modal theming) — DONE

Completed modifications:
- Types (src/lib/game/types.ts):
  * GameStats gains max_combo_achieved: number (highest combo ever achieved).
- Engine (src/lib/game/engine.ts):
  * New: updateSettings(state, patch) — merges settings patch into state.
  * New: recordMaxCombo(state, comboCount) — updates max_combo_achieved if exceeded.
  * Renamed venueEffectMultiplier → eventEffectMultiplier, now also scales by log10(1 + fans/100).
  * initialState + cloneState include max_combo_achieved.
- Definitions (src/lib/game/definitions.ts):
  * "On Fire" achievement now checks max_combo_achieved >= 20 (was: total_perf_sessions >= 20 && total_clicks >= 20, a proxy). Added progress_fn showing current/20.
- Save (src/lib/game/save.ts):
  * Permissive loader fills max_combo_achieved=0 for old saves.
- Hook (src/hooks/useGameEngine.ts):
  * click() calls recordMaxCombo before clickPerform so the stat updates on every click.
  * New action: updateSettings(patch) — merges settings + commits.
  * Exposes updateSettings via the actions object.
- UI:
  * New SettingsModal.tsx — gear icon (Settings2) in ResourceBar header, modal with:
    - Slider (0.5×–3×, step 0.1) for sim_speed with live value display.
    - Select (1/4/8/12h) for offline_cap_hours.
    - Switch for sound_enabled (placeholder — audio not yet implemented).
    - Each control calls actions.updateSettings on change, which persists to localStorage.
  * ClickStage.tsx — new "Next venue" progress indicator below the saturation bar:
    - Shows next locked venue name with fan + rep progress bars.
    - READY badge (teal) when both requirements are met.
    - Celebratory amber message when all venues are unlocked.
    - Themed with primary border + primary/5 background.
  * ResourceBar.tsx — added settings gear button next to trophy button.
  * GameShell.tsx — renders SettingsModal, manages settingsOpen state.

Verification results:
- bunx tsc --noEmit: clean.
- bun run lint: clean.
- agent-browser QA: settings modal opens via gear button, sim_speed slider changes 1→2, settings persist across reload (VLM confirmed "2.0x" after reload). Next-venue indicator shows "NEXT: SMALL CLUB" with Fans 615/250 + Rep 2/1 + READY badge (VLM confirmed). All 5 tabs functional.
- VLM critique: 8/10 polish. "The UI is very clean and modern with a soft color palette, clear typography, and well-organized information hierarchy."
- Committed (sha 32eac5a) and pushed to GitHub.

Unresolved issues / risks:
- Sound_enabled is persisted and toggleable but no audio is actually played. A future round should add click sounds, event sounds, achievement jingles.
- The sim_speed slider goes up to 3× — at 3×, passive production accrues 3× faster, but the tick is still 10Hz. This means the sim dt is multiplied by 3, which is fine for the engine (it handles any dt analytically). But at very high sim_speed + very high production, floating-point precision could become an issue. Not a concern at current scale.
- max_combo_achieved is only updated on clicks (not on passive production). This is correct — combos are a click mechanic.

Priority recommendations for next phase:
1. Add audio: click sounds, event spawn sound, achievement unlock jingle, combo escalation sound. sound_enabled toggle is ready.
2. Add more event types (rival idols, fan mail, trend forecasts, industry gossip) to add variety — currently 5 events cycle deterministically.
3. Add a "stats" panel showing lifetime stats: total clicks, max combo, songs released, events resolved, venues unlocked, time played.
4. Balance pass: monitor whether the Local Bar rep/click fix + Small Club rep req reduction makes early-game flow feel right. May need further tuning.
5. Manager era prototype (Era II) — the Idol loop is now extremely well-validated with trends, combo, events, achievements, toasts, settings, and venue guidance. Time to start the roster-management layer.

---
Task ID: cron-round-5 (recurring webDevReview)
Agent: main (orchestrator)
Task: QA the settings+venue-indicator M2 slice, then add Career Stats panel + more events + lifetime tracking.

Current project status (assessment):
- Settings + next-venue indicator from round 4 were stable on entry. Dev server running, no runtime errors, all tabs functional.
- 615 fans, 2/13 achievements. Trend showed "Pop ×2.00" (Mainstream) at time of QA.

Goals this round:
1. Add Career Stats panel (lifetime metrics) — DONE
2. Add 5 more event types (rival idols, fan mail, trend forecast, industry gossip) — DONE
3. Add lifetime tracking (total_songs_released, total_events_resolved) — DONE
4. Styling polish (stats modal with themed icons, chart button in header) — DONE

Completed modifications:
- Types (src/lib/game/types.ts):
  * GameStats gains total_songs_released: number + total_events_resolved: number (lifetime counters, never decremented).
- Engine (src/lib/game/engine.ts):
  * releaseSong: increments next.stats.total_songs_released += 1.
  * resolveEvent: increments next.stats.total_events_resolved += 1.
  * initialState includes the two new stat fields (0 default).
- Definitions (src/lib/game/definitions.ts):
  * Added 4 new event types: Rival Idol (purple, diss track response), Touching Fan Mail (pink, share vs keep private), Trend Forecast (teal, pivot vs stay), Industry Gossip (amber, leverage vs stay out). Total EVENTS now 10 (was 5). Full event cycle = 10 × 90s = 15 minutes.
  * "Decision Maker" achievement now checks total_events_resolved >= 5 (was event_log.length >= 5, which is capped at 20 and doesn't reflect lifetime count).
- Save (src/lib/game/save.ts):
  * Permissive loader fills total_songs_released=0 + total_events_resolved=0 for old saves.
- UI:
  * New StatsModal.tsx — chart icon (BarChart3) in ResourceBar header, modal showing 7 lifetime metrics in a 2-column grid: Total Clicks, Best Combo, Songs Released, Events Resolved, Venues Unlocked, Achievements, Time Played. Each with a themed Lucide icon + color. Includes a 'Current Resources' section (Fans/Cash/Rep/XP) and an active-songs + recent-events summary footer.
  * ResourceBar.tsx — added stats chart button (BarChart3) next to settings gear.
  * GameShell.tsx — renders StatsModal, manages statsOpen state.

Verification results:
- bunx tsc --noEmit: clean.
- bun run lint: clean.
- agent-browser QA: stats modal opens via chart icon, shows Total Clicks: 6, Events Resolved: 1, Venues Unlocked: 0/3, Achievements: 2/13, Time Played: 10m 5s, Current Resources with Fans/Cash/Rep/XP. All 3 header buttons visible (trophy, gear, chart). 10 event types in the cycle.
- VLM critique: 7/10 polish. Confirmed all 3 header buttons, deep progression, engaging narrative events. Issues: visual density (lots of text/numbers), some contrast concerns. Noted for future polish round.
- Committed (sha 0486bd6) and pushed to GitHub.

Unresolved issues / risks:
- VLM noted visual density as the UI accumulates features. A future round could consolidate or use progressive disclosure (e.g. collapsible sections, tabbed sub-panels) to reduce cognitive load.
- 10 events is better variety but still deterministic. A future round could add a seeded-pool approach (deterministic slot picks from a larger pool via hash).
- The stats panel shows lifetime counts but doesn't track 'time to first upgrade' or 'time to first gig' — these are designer-facing metrics the brief §9 mentions. Could add a hidden debug-stats panel for designers.

Priority recommendations for next phase:
1. Visual de-clutter: consolidate the click stage's many indicators (saturation, next-venue, passive rates, session time, combo) into a cleaner hierarchy. Use progressive disclosure.
2. Add audio: click sounds, event spawn sound, achievement jingle, combo escalation. sound_enabled toggle is ready.
3. Add a "milestones" timeline showing the player's career progression (first click → first song → first hire → venue unlocks → achievements).
4. Balance pass: with 10 events and venue-tier + log(fans) scaling, the event economy is now rich. Monitor whether events feel impactful at each stage.
5. Manager era prototype (Era II) — the Idol loop is now extremely well-validated. The prototype has: click+combo, 6 upgrades, 4 venues, 3 songs, 4 staff, trends, 10 events, 13 achievements, toasts, settings, career stats, venue guidance, offline progression, prestige teaser. Time to start the roster-management layer.

---
Task ID: cron-round-6 (recurring webDevReview)
Agent: main (orchestrator)
Task: QA the stats+events M2 slice, then add Career Timeline (milestones) system.

Current project status (assessment):
- Stats panel + 10 events from round 5 were stable on entry. Dev server running, no runtime errors, all tabs functional.
- 1.36K fans, 3/13 achievements. Trend showed "Pop ×0.75" (Declining) at QA time.
- Events spawn frequently during testing (90s cycle) — noted as a minor friction for automated QA but not a bug.

Goals this round:
1. Add Career Milestones system (timeline of significant moments) — DONE
2. Build MilestonesModal with vertical timeline UI — DONE
3. Add 4th header button (History icon) with badge — DONE
4. Styling polish (timeline visuals, colored dots, empty state) — DONE

Completed modifications:
- Types (src/lib/game/types.ts):
  * New Milestone interface (id, label, icon, timestamp, tint).
  * GameState gains milestones: Milestone[] (chronological, oldest first).
- Engine (src/lib/game/engine.ts):
  * New constant: MILESTONE_LOG_MAX = 50.
  * New: recordMilestone(state, milestone) → { state, milestone | null } — idempotent by id, appends + prunes to max.
  * cloneState deep-clones milestones.
  * initialState includes milestones: [].
- Save (src/lib/game/save.ts):
  * Permissive loader fills milestones=[] for old saves.
- Hook (src/hooks/useGameEngine.ts):
  * commit() now records milestones after every engine action:
    - First Click (total_clicks >= 1)
    - First Song Released (total_songs_released >= 1)
    - First Staff Hire (any staff count > 0)
    - Venue Unlocks (one per unlocked venue, excluding starting Local Bar)
    - Achievement Unlocks (one per newly_unlocked achievement)
  * Exposes milestones: Milestone[] in the return.
- UI:
  * New MilestonesModal.tsx — History icon in ResourceBar header, modal showing vertical timeline:
    - Newest-first ordering (reversed from storage).
    - Colored dots (pink/amber/teal/purple) on a vertical line.
    - Each entry: icon, label, relative timestamp ('Xs ago', 'Xm ago').
    - Empty state: clock icon + 'Your journey begins with the first click.'
    - Badge on header button showing milestone count (primary color).
  * ResourceBar.tsx — added 4th header button (History icon) with count badge.
  * GameShell.tsx — renders MilestonesModal, manages milestonesOpen state.

Verification results:
- bunx tsc --noEmit: clean.
- bun run lint: clean.
- agent-browser QA: header shows 'View career timeline: 1 milestones' with badge. Modal opens showing 'First Click' milestone with footprint icon (👣) + '0s ago' timestamp. Vertical timeline with colored dot confirmed by VLM.
- VLM critique: 8/10 polish. "Clean and modern with consistent color palette, clear typography, well-organized layout. Professional and fits the idol aesthetic."
- Committed (sha 6b6b43e) and pushed to GitHub.

Unresolved issues / risks:
- Milestones are only recorded from this point forward — existing saves get 'First Click' retroactively (since total_clicks >= 1 on load), but not 'First Song' or 'First Hire' unless those actions happen again. This is acceptable — milestones are meant to capture the journey going forward.
- The event spawn cycle (90s) made automated QA testing difficult — events kept blocking button clicks. A future round could add a "pause events" debug toggle for testing.
- The header now has 4 icon buttons (trophy, gear, chart, history) which is getting crowded on mobile. A future round could group them into a single "menu" button on small screens.

Priority recommendations for next phase:
1. Visual de-clutter of ClickStage: consolidate saturation + next-venue + passive rates + session time into a collapsible 'Details' section (was planned for this round but deferred to prioritize milestones).
2. Add audio: click sounds, event spawn sound, achievement jingle, combo escalation. sound_enabled toggle is ready.
3. Add a "pause events" debug toggle to make automated QA easier.
4. Responsive header: group the 4 icon buttons into a dropdown menu on mobile.
5. Manager era prototype (Era II) — the Idol loop is now extremely well-validated with: click+combo, 6 upgrades, 4 venues, 3 songs, 4 staff, trends, 10 events, 13 achievements, toasts, settings, career stats, career timeline (milestones), venue guidance, offline progression, prestige teaser. Time to start the roster-management layer.

Follow-up: ClickStage de-clutter (collapsible Details section)
- Wrapped passive rates (Fans/s, Cash/s, Rep/s) + session time + click count
  in a Collapsible component with a 'Details' toggle button (ChevronDown icon
  that rotates 180° when open). Default collapsed.
- Keeps the click stage focused on: idol portrait, combo counter, saturation
  bar, and next-venue indicator. Players who want the numbers can expand.
- VLM polish rating: 9/10 (up from 8/10). "The collapsible section is a great
  UX addition for managing information density."
- Committed (sha 7f3a22d) and pushed to GitHub.

---
Task ID: cron-round-7 (recurring webDevReview)
Agent: main (orchestrator)
Task: QA the milestones+de-clutter M2 slice, then add pause-events toggle + 2 achievements + venue tier badges.

Current project status (assessment):
- Milestones + collapsible Details from round 6 were stable on entry. Dev server running, no runtime errors, all tabs functional.
- 7.11K fans, 3/13 achievements. Trend showed "EDM ×1.60" (Growing).

Goals this round:
1. Add pause-events debug toggle (makes QA easier) — DONE
2. Add 2 new achievements (Combo Master, Venue Explorer) — DONE
3. Add venue tier badges (T1-T4) to VenuesPanel — DONE

Completed modifications:
- Types (src/lib/game/types.ts):
  * GameSettings gains events_paused: boolean (default false).
- Engine (src/lib/game/engine.ts):
  * spawnEventIfNeeded: early return if state.settings.events_paused is true (and no active event).
  * initialState includes events_paused: false.
- Save (src/lib/game/save.ts):
  * Permissive loader fills events_paused=false for old saves.
- Definitions (src/lib/game/definitions.ts):
  * 2 new achievements: Combo Master (⚡, 50× combo), Venue Explorer (🗺️, unlock 2 venues). Total now 15.
- UI:
  * DebugPanel.tsx — Pause/Play toggle button in the Force event section. When paused, shows "Resume events" (Play icon); when active, shows "Pause events" (Pause icon). Calls actions.updateSettings({ events_paused: !current }).
  * VenuesPanel.tsx — added T1/T2/T3/T4 tier badge (T{unlock_order + 1}) next to each venue name. Helps players understand the venue hierarchy.

Verification results:
- bunx tsc --noEmit: clean.
- bun run lint: clean.
- agent-browser QA: Pause events button works — after clicking, no event spawned in 15s wait (previously events spawned every 90s). Button label changed to "Resume events". Achievements count shows 3/15 (was 3/13). Venue tier badges T1-T4 confirmed by VLM.
- Committed (sha e999b5f) and pushed to GitHub.

Priority recommendations for next phase:
1. Add audio: click sounds, event spawn sound, achievement jingle, combo escalation. sound_enabled toggle is ready.
2. Responsive header: group the 4 icon buttons into a dropdown menu on mobile.
3. Balance pass: with 15 achievements and venue tier scaling, monitor progression pacing.
4. Manager era prototype (Era II) — the Idol loop is now extremely well-validated. Time to start the roster-management layer.

---
Task ID: cron-round-8 (recurring webDevReview)
Agent: main (orchestrator)
Task: QA the pause-events+achievements M2 slice, then add responsive mobile header + Web Audio API sound system.

Current project status (assessment):
- Pause events + venue tier badges from round 7 were stable on entry. Dev server running, no runtime errors, all tabs functional.
- 7.11K fans, 3/15 achievements. Trend showed "Pop ×2.00" (Mainstream).

Goals this round:
1. Add responsive mobile header (dropdown menu for 4 icon buttons) — DONE
2. Add Web Audio API sound system (click, combo, event, achievement, milestone) — DONE
3. Styling polish (mobile header, audio feedback) — DONE

Completed modifications:
- UI (src/components/game/ResourceBar.tsx):
  * Added DropdownMenu import + Menu icon.
  * On mobile (< sm): shows a single hamburger menu button that opens a dropdown with 4 items: Achievements (X/15), Career Stats, Timeline (N), Settings.
  * On sm+ screens: keeps the 4 inline icon buttons (hidden on mobile via sm:inline-flex / sm:hidden classes).
- Audio (new src/lib/game/audio.ts):
  * AudioEngine class — singleton, Web Audio API-based, no audio files.
  * 5 sound types: click (triangle 440→220Hz), combo_tick (sine, pitch scales with combo), event_spawn (E5→A5 chime), achievement (C5→E5→G5 arpeggio), milestone (A4 bell).
  * Lazily creates AudioContext on first play (browser autoplay policy).
  * Master volume 0.15 (quiet). Gated by setEnabled().
  * getAudioEngine() singleton accessor.
- Hook (src/hooks/useGameEngine.ts):
  * Syncs audioEngine.setEnabled with snapshot.settings.sound_enabled.
  * click() plays 'click' normally, 'combo_tick' at thresholds [3, 5, 10, 20, 50].
  * commit() plays 'event_spawn' on event spawn, 'achievement' on unlock, 'milestone' on milestone record.

Verification results:
- bunx tsc --noEmit: clean.
- bun run lint: clean.
- agent-browser QA: Desktop header shows 4 inline buttons. Mobile (390px) shows single "Open menu" button → dropdown with 4 items (Achievements 3/15, Career Stats, Timeline 1, Settings). Clicking Perform triggers audio with no console errors. VLM confirmed mobile dropdown is "clean and minimalistic".
- Committed (sha ccfd508) and pushed to GitHub.

Priority recommendations for next phase:
1. Balance pass: with 15 achievements, venue tier scaling, log(fans) event scaling, and audio feedback, the game feel is rich. Monitor progression pacing.
2. Add more pixel-art sprites: multiple idol portraits, venue backgrounds, staff icons.
3. Save-slot expansion: currently single autosave. Add multi-slot support.
4. Manager era prototype (Era II) — the Idol loop is now extremely well-validated with: click+combo+audio, 6 upgrades, 4 venues (tier badges), 3 songs, 4 staff, trends, 10 events (pause toggle), 15 achievements, toasts, settings, career stats, career timeline (milestones), responsive mobile header, venue guidance, offline progression, prestige teaser. Time to start the roster-management layer.

---
Task ID: cron-round-9 (recurring webDevReview)
Agent: main (orchestrator)
Task: QA the responsive-header+audio M2 slice, then add multi-slot save system + export/import.

Current project status (assessment):
- Responsive header + audio from round 8 were stable on entry. Dev server running, no runtime errors, all tabs functional.

Goals this round:
1. Add multi-slot save system (3 slots) — DONE
2. Add export/import backup functionality — DONE
3. Add SaveSlotsModal with slot preview + switch/delete/export/import — DONE

Completed modifications:
- Save (src/lib/game/save.ts):
  * Refactored from single-slot to multi-slot: SAVE_KEY_PREFIX, SAVE_SLOT_COUNT=3, slotKey(slot).
  * New: listSlots() — returns array of slot metadata (slot, exists, fans, cash, started_at, last_saved_at, total_clicks) for the picker UI.
  * loadGame(slot), saveGame(state, slot), clearSave(slot) — all slot-aware.
  * New: exportSave(state) — base64-encoded JSON for backup.
  * New: importSave(encoded) — decode + parse base64/JSON, returns GameState | null.
  * New: migrateLegacySave() — one-time copy of old single-slot key to slot 1 if slot 1 is empty. Preserves existing saves.
- Hook (src/hooks/useGameEngine.ts):
  * Tracks activeSlotRef + activeSlot state.
  * All save/load operations use activeSlotRef.current.
  * New actions: switchSlot(slot), deleteSlot(slot), exportCurrentSave(), importToSlot(encoded, slot).
  * Exposes activeSlot in the return.
  * Calls migrateLegacySave() on mount before loading.
- UI:
  * New SaveSlotsModal.tsx — modal with 3 slot cards:
    - Each shows: slot number, ACTIVE/EMPTY badge, relative last-saved time, fans/cash/clicks preview.
    - 4 action buttons per slot: Switch (load), Export (copy base64 to clipboard), Import (collapsible Textarea), Delete (with confirm).
    - Active slot highlighted with pink border + ACTIVE badge.
    - Export success: green "Save code copied to clipboard!" banner.
    - Import: validates + shows success/error status.
  * ResourceBar.tsx — 5th header button (Save icon) with active-slot number badge. Mobile dropdown includes "Save Slots (N/3)" item.
  * GameShell.tsx — renders SaveSlotsModal, manages saveSlotsOpen state.

Verification results:
- bunx tsc --noEmit: clean.
- bun run lint: clean.
- agent-browser QA: Save Slots modal opens showing 3 slots. Slot 1: ACTIVE with fans/cash/clicks preview. Slots 2 & 3: EMPTY badges. Switch/Export/Import/Delete buttons per slot. Active slot highlighted with pink border. VLM confirmed "clearly highlighted with pink border and ACTIVE badge".
- Committed (sha a2adc55) and pushed to GitHub.

Priority recommendations for next phase:
1. Balance pass: with multi-slot saves, players can experiment with different strategies. Monitor progression pacing.
2. Add more pixel-art sprites: multiple idol portraits, venue backgrounds, staff icons.
3. Manager era prototype (Era II) — the Idol loop is now extremely well-validated with: click+combo+audio, 6 upgrades, 4 venues (tier badges), 3 songs, 4 staff, trends, 10 events (pause toggle), 15 achievements, toasts, settings, career stats, career timeline (milestones), responsive mobile header, multi-slot saves + export/import, venue guidance, offline progression, prestige teaser. Time to start the roster-management layer.

---
Task ID: cron-round-10 (recurring webDevReview)
Agent: main (orchestrator)
Task: QA the multi-slot save M2 slice, then do balance pass + content expansion.

Current project status (assessment):
- Multi-slot saves + export/import from round 9 were stable on entry. Dev server running, no runtime errors, all tabs functional.

Goals this round:
1. Balance pass (addresses persistent 'early-game pacing' recommendation across 9 rounds) — DONE
2. Add 4 new upgrades (6→10 total) — DONE
3. Add 2 new songs (3→5 total) — DONE

Completed modifications:
- Balance changes (src/lib/game/definitions.ts):
  * Local Bar: base_reward_fans 1→2, base_reward_cash 1→2 (first clicks feel rewarding)
  * Small Club: fan_requirement 250→200 (faster early progression)
  * Better Microphone: base_cost 25→15 (first upgrade reachable in ~30 clicks)
  * Assistant: base_cost 50→40, base_production_fans 10→15/min (cheaper + better passive)
- 4 new upgrades:
  * Dance Instructor (performance, +2/rank, $300, growth 1.18, max 40) — mid-game click power
  * Fan Club (marketing, +3/rank, $500, growth 1.19, max 30) — high-end click power
  * Stage Wardrobe (lifestyle, +2%/rank, $250, growth 1.17, max 30) — staff production boost
  * Music Theory (training, +3/rank, $400, growth 1.19, max 30) — song quality boost
- 2 new songs:
  * Moonlight Ballad (J-Pop, $5K cash + 5 rep, quality 3.0, 6h decay) — slow-burn long-tail
  * Neon Pulse (EDM, $25K cash + 20 rep, quality 5.0, 2.5h decay) — high-tier endgame

Verification results:
- bunx tsc --noEmit: clean.
- bun run lint: clean.
- agent-browser QA: All 10 upgrades confirmed in DOM snapshot (Better Microphone, Viral Dance, Social Media Push, Vocal Lessons, Choreography Coach, Energy Drinks, Dance Instructor, Fan Club, Stage Wardrobe, Music Theory). All 5 songs confirmed (Debut Single, Catching the Vibe, Hypnotic, Moonlight Ballad, Neon Pulse). VLM 9/10 polish.
- Committed (sha b3a5c6e) and pushed to GitHub.

Priority recommendations for next phase:
1. The Idol era is now content-complete: 10 upgrades, 5 songs, 4 staff, 4 venues, 10 events, 15 achievements, trends, combo, audio, toasts, milestones, stats, settings, multi-slot saves, export/import, responsive header, venue guidance, offline progression, prestige teaser.
2. Manager era prototype (Era II) — the Idol loop is fully validated and content-rich. Time to start the roster-management layer per the brief's prestige ladder.
3. More pixel-art sprites: multiple idol portraits, venue backgrounds, staff icons.
4. Consider writing the full design document for GLM-5.3Flash to write the Godot version — the prototype is now comprehensive enough to serve as the reference implementation.

---
Task ID: portrait-gen
Agent: sub-agent (general-purpose, image-generation)
Task: Generate 8 pixel-art idol character portraits (4 female, 4 male) for character selection in the Idol Incremental web game.

Goals:
1. Generate 8 visually-distinct pixel-art portraits matching specific archetypes — DONE
2. Save to /public/game/idols/ with exact filenames — DONE
3. Avoid indigo/blue palette per system rules; use varied per-character palettes — DONE
4. Use z-ai-web-dev-sdk CLI (backend) at 1024x1024 — DONE

Completed deliverables (all in /home/z/my-project/public/game/idols/, all true PNG, 1024x1024):
Female:
- idol-cute-female.png       — The Cute One: pink hair, big eyes, frilly pink dress, heart. Palette: pink/rose/magenta.
- idol-girlcrush-female.png  — The Girl Crush: short dark hair w/ crimson streak, leather jacket, smirk. Palette: dark/charcoal + crimson.
- idol-innocent-female.png   — The Innocent Type: long white hair, white dress, serene. Palette: white/cream + pale gold.
- idol-sunshine-female.png   — The Sunshine: bright orange hair, goofy grin, peace sign, colorful casual. Palette: orange/yellow/coral.
Male:
- idol-tough-male.png        — The Tough One: muscular, dark hair, black tank top, stern. Palette: charcoal + intense crimson.
- idol-prettyboy-male.png    — The Pretty Boy: light brown hair, pastel button-up, princely. Palette: pastel pink/mint/peach.
- idol-cool-male.png         — The Cool Intellectual: black hair, dark glasses, charcoal turtleneck, aloof. Palette: charcoal + deep emerald.
- idol-adorkable-male.png    — The Adorkable: messy brown hair, big round glasses, oversized sweater, awkward smile. Palette: warm brown/mustard/amber.

Method / notes:
- Invoked image-generation skill, used the `z-ai image` CLI (backend) at size 1024x1024 for all 8.
- Prompts enforced: 16-bit retro pixel art style, character-selection bust framing, explicit "no blue no indigo" + per-character palette, dithering + crisp pixel shading, square format.
- All 8 generations ultimately succeeded. Two female portraits (girlcrush, innocent) initially failed with HTTP 429 (rate limit from a 4-way parallel batch); retried sequentially with 20s spacing → success. One female (sunshine) was generated successfully but the backgrounded subshell inherited a different cwd and wrote to /home/z/my-project/idol-sunshine-female.png; recovered and moved into the idols dir.
- The SDK returns JPEG-encoded bytes regardless of the .png output path. Verified all 8 files were JPEG-as-png and re-encoded them to true PNG (8-bit RGB, non-interlaced) via a one-off sharp script so Next.js static serving Content-Type is correct. Temp script removed after use.

Verification results:
- `file *.png` on all 8: "PNG image data, 1024 x 1024, 8-bit/color RGB, non-interlaced" — all valid.
- File sizes range ~485 KB to ~1.5 MB (lossless PNG re-encode).
- All filenames match the spec exactly.
- Palette audit: no portrait uses indigo/blue as a dominant color. Cool Intellectual uses charcoal + deep emerald (green, not blue) deliberately to comply.

Priority recommendations for next phase:
1. Wire these 8 portraits into a character-selection screen / roster UI (the existing single idol-portrait.png can become the "default" while these 8 become selectable). The SaveSlotsModal + GameShell are natural integration points.
2. Add a JSON manifest (e.g. /src/lib/game/idols.ts) mapping filename → archetype name, gender, starting-stat bias (e.g. Cute: +charisma, Tough: +stamina, Cool: +rep gain, Adorkable: +luck/crit) so portraits become a gameplay lever, not just cosmetic.
3. Consider downscaling to 256x256 or 512x512 display-sized PNGs (or WebP) for faster page weight — the 1024x1024 sources are ~1MB each; the UI rarely needs full-res.
4. Future portrait expansions: add 2-3 "rival idol" portraits (antagonists) and venue-specific stage backgrounds in the same pixel-art style for visual cohesion.
5. Godot port note: these PNGs are reusable as-is (Godot imports PNG textures), so the asset pipeline for Era II / Godot is already fed.

---
Task ID: phase-a (idol archetype selection + stat system + training)
Agent: main (orchestrator)
Task: Implement Phase A of the core loop redesign — idol selection + stats + training.

Current project status (assessment):
- The game was stable with 10 rounds of accumulated features. The user provided detailed feedback for a core loop redesign:
  1. Character selection at game start (8 archetypes: 4 female, 4 male)
  2. Idol stats (Vocals, Dance, Charisma, Charm, STAR FACTOR)
  3. Training feature (click to level stats)
  4. Performing grows stats + STAR FACTOR
  5. Events can change stats
  6. Energy/action system (Phase B)
  7. Free time menu with Training/Social/Stay Home/Go Out (Phase B)
  8. Songs as milestone unlocks (Phase D)
  9. Staff rework to coaches (Phase D)
  10. Tutorial system (Phase E)

Goals this round (Phase A):
1. Generate 8 idol archetype portraits — DONE (via subagent)
2. Add IdolArchetype type + ARCHETYPES definitions — DONE
3. Add IdolStats to GameState + chosen_archetype field — DONE
4. Build CharacterSelectModal — DONE
5. Add Train buttons (StatPanel) — DONE
6. Update click formula to use stats — DONE
7. Fix 4 UX issues from user feedback — DONE

Completed modifications:
- New src/lib/game/idols.ts: 8 archetypes with portraits, stats, descriptions.
- Types: GameState gains chosen_archetype + idol_stats (IdolStats: vocals, dance, charisma, charm, star_factor).
- Engine:
  * initialState(nowMs, archetypeId) — supports empty archetype for character select.
  * cloneState deep-clones idol_stats.
  * clickPerform: new formula uses Dance (×0.02/stat), Charisma (×0.01/stat), Charm (×0.01/stat for rep), Vocals (×0.005/stat for XP), STAR FACTOR (global ×(1 + sf*0.1)).
  * Performing grows all stats +0.01/click, STAR FACTOR +0.001/click.
  * New: trainStat(state, stat) — +0.5 to a trainable stat.
  * New: starFactorMultiplier(state).
- Save: permissive loader fills chosen_archetype + idol_stats for old saves.
- clearSave/deleteSlot/switchSlot use empty archetype for fresh saves → triggers character select.
- UI:
  * CharacterSelectModal: 8 archetype cards with portraits, stat badges, confirm button.
  * StatPanel: 4 trainable stats with progress bars + Train buttons + STAR FACTOR display.
  * ClickStage: uses chosen archetype's portrait; venue progress is a clickable button; Details dropdown removed (rates always visible); rep shows 1 decimal for values < 10.
  * EventModal: fixed transparency (bg-card instead of gradient).

Verification results:
- tsc clean, lint clean.
- agent-browser QA: character select modal shows all 8 archetypes after wipe save. Stat panel shows Vocals 10.0, Dance 10.0, Charisma 10.0, Charm 10.0, STAR ×1.10. Train buttons work. ClickStage shows chosen archetype's portrait.
- VLM 9/10 polish.
- Committed (sha 342e2c0) and pushed to GitHub.

Questions for the user (pending answers):
1. Energy system: fixed pool per session that regenerates over real time, OR resets when you perform?
2. Performance: consumes all remaining energy? Or fixed cost? Scales with how you spent free time?
3. STAR FACTOR: persists across sessions/performances as permanent meta-progression?
4. "Going out" risk/reward ratio: 50/50? 60/40?
5. Archetype gameplay effects: purely visual, or different starting stats? (Implemented as different starting stats.)

Priority recommendations for next phase:
1. Phase B: Energy/action system — add energy to GameState, implement the free time menu (Train/Social/Stay Home/Go Out), make Performance the session payoff.
2. Phase C: Performance as a session event with venue cost + big reward.
3. Phase D: Songs as milestone unlocks + staff rework to coaches.
4. Phase E: Tutorial system.

---
Task ID: rename-fame
Agent: subagent (rename-fame)
Task: Rename all occurrences of `reputation` → `fame` across the codebase. The user has decided to replace "Reputation" with "Fame" (which can go negative, displayed as "Infamy"). Mechanical rename only — no game logic changes.

Context:
- `src/lib/game/types.ts` had the rename of `ResourceType` ('reputation' → 'fame') and the `Resources` interface (`reputation: number` → `fame: number`) already done by the user before this task started.
- This task handled the cascade: every other file that referenced the old `reputation` field, the `rep_requirement` / `base_reward_rep` / `base_cost_rep` / `base_production_rep` property names on definition interfaces, local variable names like `repPerSec` / `repOk` / `repMet` / `repGained` / `repFromStaff` / `rep` / `P0_rep` / `rep_gained` (local), and all user-visible "Rep"/"Reputation"/"rep" display strings.

Scope decisions (deliberate non-renames for minimal blast radius):
- Did NOT rename `ProductionDeltas.reputation` (in types.ts) — kept field name. `deltas.reputation` access sites in engine.ts stay.
- Did NOT rename `OfflineSummary.rep_gained` (in types.ts) — kept field name. `summary.rep_gained` accesses stay.
- Did NOT rename `SocialResult.rep_gained` / `WeekResult.rep_gained` (in engine.ts) — kept field names.
- Did NOT rename `staffProductionRate`'s inline return type field `reputation: number` (in engine.ts) — kept field name. `staffRate.reputation` accesses stay (in engine.ts, ResourceBar, ClickStage, StaffPanel).
- Did NOT rename the `PRESTIGE_REP_REQ` constant in engine.ts (or the mirror `REP_GOAL` constant in PrestigePanel.tsx) — those are just identifier names; the visible strings ("100 Fame", "Reputation milestone" → "Fame milestone", etc.) were updated.
- Did NOT rename the `IconKind = 'rep'` literal in `icons.tsx` — the underlying PNG file `icon-rep.png` doesn't need renaming; only the visible label "Rep" was changed to "Fame".
- Did NOT rename the local `nextVenueRepPct` variable in ClickStage.tsx (not in the listed variable-rename scope); it still works because it now references `nextVenue.fame_requirement`.
- `OfflineModal.tsx` was added to the rename scope (not in the original task list) because its visible "Rep" label needed to become "Fame" for consistency.
- `idols.ts` comments mentioning "rep"/"reputation" were also updated for consistency.

Completed modifications:
- `src/lib/game/types.ts`:
  * VenueDefinition: `rep_requirement` → `fame_requirement`, `base_reward_rep` → `base_reward_fame` (and updated comments).
  * SongDefinition: `base_cost_rep` → `base_cost_fame`.
  * StaffDefinition: `base_production_rep` → `base_production_fame` (necessary for StaffPanel compilation; not in original listed scope but required).
  * EventChoice description example comment: "+500 fans, -3 rep" → "+500 fans, -3 fame".
  * Did NOT touch ResourceType / Resources / ProductionDeltas / OfflineSummary (per the "already done / don't touch beyond listed" constraint).
- `src/lib/game/definitions.ts`:
  * All `rep_requirement:` → `fame_requirement:`, `base_reward_rep:` → `base_reward_fame:`, `base_cost_rep:` → `base_cost_fame:`, `base_production_rep:` → `base_production_fame:` across all VENUES, SONGS, STAFF entries.
  * All `effects: { reputation: ... }` → `effects: { fame: ... }` across all EVENTS (required for Partial<Resources> compilation).
  * All user-visible "rep" strings in event choice descriptions → "fame".
  * Staff Coach description: "industry reputation" → "industry fame".
  * Header comments updated (e.g. "fans/cash/rep" → "fans/cash/fame").
- `src/lib/game/engine.ts`:
  * All `state.resources.reputation` → `state.resources.fame`.
  * All `next.resources.reputation` → `next.resources.fame`.
  * All `.rep_requirement` → `.fame_requirement`, `.base_reward_rep` → `.base_reward_fame`, `.base_cost_rep` → `.base_cost_fame`, `.base_production_rep` → `.base_production_fame`.
  * All `choice.effects.reputation` → `choice.effects.fame` (Partial<Resources> access).
  * All `amount.reputation` → `amount.fame` (Partial<Resources> access in grantResources).
  * Local variable renames: `repPerSec` → `famePerSec`, `repFromStaff` → `fameFromStaff`, `repGained` → `fameGained`, local `rep` (in socialGathering & performWeek) → `fame`, local `P0_rep` → `P0_fame`, local `rep_gained` (in clickPerform) → `fame_gained`.
  * Comments mentioning "rep"/"reputation"/"Reputation" → "fame"/"Fame".
  * `getPrestigeInfo` current_requirement string: "1,000,000 Fans and 100 Reputation" → "1,000,000 Fans and 100 Fame".
- `src/lib/game/save.ts`:
  * Validation loop: now checks `['fans', 'cash', 'fame', 'experience']` with a one-off fallback for `fame`: if `resourcesIn.fame` is not a number, tries `resourcesIn.reputation` so legacy saves with the old `reputation` JSON key still load. If neither is a number, returns the `'Invalid resource: fame'` error.
  * State assembly: `fame:` field now assigned via `typeof resourcesIn.fame === 'number' ? resourcesIn.fame : (typeof resourcesIn.reputation === 'number' ? resourcesIn.reputation : 0)`.
  * `listSlots()` already only reads `fans` and `cash` from the resources object — no changes needed (no `reputation` reference was present).
- `src/hooks/useGameEngine.ts`:
  * Updated 3 comments mentioning "rep"/"reputation" → "fame" (Release song, Unlock venue, Social gathering).
  * `summary.rep_gained > 0` field access left unchanged (field name on OfflineSummary stays).
- `src/lib/game/idols.ts`:
  * Updated 2 comments: "Affects reputation gain rate" → "Affects fame gain rate", "fans, cash, rep, XP" → "fans, cash, fame, XP".
- `src/components/game/ResourceBar.tsx`: label "Rep" → "Fame"; `repPerSec` → `famePerSec`; `state.resources.reputation` → `state.resources.fame`; "Reputation" in header comment → "Fame".
- `src/components/game/ClickStage.tsx`: `repMet` → `fameMet`; `repPerSec` → `famePerSec`; `rep_requirement` → `fame_requirement`; `state.resources.reputation` → `state.resources.fame`; "Rep" label → "Fame"; "Rep/s" → "Fame/s".
- `src/components/game/VenuesPanel.tsx`: `repOk` → `fameOk`; `rep_requirement` → `fame_requirement`; `base_reward_rep` → `base_reward_fame`; "rep" text → "fame" everywhere.
- `src/components/game/SongsPanel.tsx`: `base_cost_rep` → `base_cost_fame`; `state.resources.reputation` → `state.resources.fame`; "rep" text → "fame".
- `src/components/game/StaffPanel.tsx`: `base_production_rep` → `base_production_fame`; "Rep/s" → "Fame/s"; "rep/min" → "fame/min".
- `src/components/game/PrestigePanel.tsx`: `repPct` → `famePct`; "Reputation milestone" → "Fame milestone"; `state.resources.reputation` → `state.resources.fame`; tooltip formula "log₁₀(1 + rep/10)" → "log₁₀(1 + fame/10)".
- `src/components/game/StatsModal.tsx`: "Rep" label → "Fame"; `resources.reputation` → `resources.fame`.
- `src/components/game/EventModal.tsx`: `effects.reputation` → `effects.fame` (the `kind: 'rep'` local chip kind stays — it maps to ICON_MAP).
- `src/components/game/DebugPanel.tsx`: `actions.grantResources({ ... reputation: n/100, ... })` → `... fame: n/100, ...`.
- `src/components/game/StatPanel.tsx`: comment "fans/cash/rep" → "fans/cash/fame".
- `src/components/game/OfflineModal.tsx`: visible label "Rep" → "Fame" (the `kind="rep"` SummaryLine prop and `summary.rep_gained` field access stay — IconKind still has 'rep', and OfflineSummary field name stays).

Verification results:
- `bunx tsc --noEmit`: 0 errors in `src/`. (Pre-existing errors in `examples/websocket/` and `skills/` directories remain — unrelated to this task.)
- `bun run lint`: clean (eslint . → no output).

Notes for the user:
- New saves will write `resources.fame` to localStorage. Old saves with `resources.reputation` will still load via the save.ts fallback. Once an old save is loaded, the engine mutates `state.resources.fame` directly, so any subsequent `saveGame(state)` call writes the new `fame` key — the migration is implicit on first load + first save.
- The icon PNG file `/public/game/icon-rep.png` was NOT renamed. The IconKind literal `'rep'` and `PATHS.rep` mapping in `icons.tsx` were NOT renamed. Only the visible label was changed. If a future task wants to rename the icon file too, update `icons.tsx` IconKind + PATHS and `mv` the file.
- `PRESTIGE_REP_REQ` (engine.ts) and `REP_GOAL` (PrestigePanel.tsx) constants keep their `REP_` prefix identifiers — only the user-visible text was changed. Renaming the constants would touch code that's out of the listed scope and isn't necessary for compilation.
- The `ProductionDeltas` and `OfflineSummary` interfaces in `types.ts` still have `reputation` and `rep_gained` fields respectively. This is intentional per the task's "do not touch types.ts beyond listed items" constraint. All consumers of these interfaces (`deltas.reputation`, `summary.rep_gained`) continue to use the old field name; this doesn't affect compilation or runtime behavior.

---
Task ID: fix-phase-d
Agent: subagent (fix-phase-d)
Task: Fix all TypeScript compilation errors caused by Phase D changes (songs as milestone unlocks + staff as coaches). Definitions and types were already updated; this task updated the engine + UI code to match.

Context:
- Phase D redesigned two core systems:
  1. Songs: were cash+fame buyable → now milestone unlocks gated by `fan_unlock: number`. SongDefinition dropped `base_cost_cash` and `base_cost_fame`, gained `fan_unlock`. Engine's `releaseSong` was already updated to validate `state.resources.fans < def.fan_unlock` and to forbid re-releasing an already-released song.
  2. Staff: were resource producers (fans/cash/fame per minute) → now coaches that boost a single idol stat per second. StaffDefinition dropped `base_production_fans` / `base_production_cash` / `base_production_fame`, gained `stat: 'vocals'|'dance'|'charisma'|'charm'` and `boost_per_sec: number`; `produces_per` changed from `'minute'` to `'second'`. `staffProductionRate()` now returns `{ vocals, dance, charisma, charm }` instead of `{ fans, cash, reputation }`.
- `bunx tsc --noEmit` initially reported 23 errors across 5 files (engine.ts, ResourceBar.tsx, ClickStage.tsx, SongsPanel.tsx, StaffPanel.tsx), all stemming from the renamed/removed fields.

Scope decisions (deliberate non-changes for minimal blast radius):
- Did NOT modify `types.ts` or `definitions.ts` — already correct per the task constraint.
- Did NOT apply coach stat boosts in `applyOffline` or `simulateOffline` — the task instructions explicitly said to add them in `tick()` only. Coach stat growth is intentionally a live activity that rewards active play (offline catch-up still gives fans-from-songs + the offline summary reports those fans; it just doesn't grow stats). Future tasks can revisit if offline stat growth is desired.
- Did NOT remove `staffProductionRate`'s export or its lifestyle-multiplier logic — it's still called by `tick()` and by `StaffPanel` for the stat-boost summary.
- Did NOT touch `ProductionDeltas` / `OfflineSummary` field names (`reputation` / `rep_gained`) — those still carry `0` deltas; `passiveProduction` now returns `cash: 0, reputation: 0, experience: 0` (no passive cash/fame in Phase D — those come from End Week + events).
- Did NOT remove the now-unused `formatRate` import in `ResourceBar.tsx` — pre-existing (the import was unused before Phase D too); not introduced by this task, so left alone to avoid scope creep. Lint still passes (eslint doesn't flag it).
- Did NOT rename `staffProductionRate` to `coachBoostRate` or similar — keeping the function name preserves API stability for any external consumers and is the minimal change.
- `idol_stats` grows unbounded during live play (no cap, no logarithmic saturation). This matches existing behavior elsewhere in the engine (e.g. `trainStat`, `clickPerform` growth). Capping is a design decision deferred to a future task.

Completed modifications:
- `src/lib/game/engine.ts`:
  * `passiveProduction()`: removed the `staffRate = staffProductionRate(state)` call, removed `fansFromStaff` / `cashFromStaff` / `fameFromStaff` lines (including the logistic saturation block — `addressableAudience` / `saturationFactor` are no longer referenced here). Return is now `{ fans: fansFromSongs, cash: 0, reputation: 0, experience: 0 }`. Updated the docstring to note staff are now coaches that boost stats in `tick()`, not resources here.
  * `tick()`: after applying `deltas` to `next.resources.*`, added a coach stat-boost block that calls `staffProductionRate(state)` and increments `next.idol_stats.vocals/dance/charisma/charm` by `staffRate.<stat> * dtSeconds` (guarded by an `if` that short-circuits when all four rates are zero, to avoid needless work for players with no coaches hired).
- `src/components/game/ResourceBar.tsx`:
  * Removed the `staffProductionRate` import (only `songProductionRate` remains).
  * Removed the `staffRate` local variable.
  * `fansPerSec` = `songRate` only (songs still produce fans passively).
  * `cashPerSec` = 0 (no passive cash — cash comes from End Week + events).
  * `famePerSec` = 0 (no passive fame — fame comes from End Week + events).
  * Added a Phase D comment explaining the change.
- `src/components/game/ClickStage.tsx`:
  * Removed the `staffProductionRate` import.
  * Removed the `staffRate` local variable.
  * `fansPerSec` = `songRate` only; `cashPerSec` = 0; `famePerSec` = 0. The existing compact inline display ("Fans +X/s · Cash +X/s · Fame +X/s") still renders; cash/fame now show as "+0/s".
  * Added a Phase D comment.
- `src/components/game/SongsPanel.tsx`:
  * Replaced all `base_cost_cash` / `base_cost_fame` references with `fan_unlock`.
  * Card now shows either "Released ✓" (if `state.released_songs` contains a song with this `def_id`) or "Unlocks at X fans" (with red text if `state.resources.fans < song.fan_unlock`, foreground color otherwise).
  * Release button enabled iff `fansMet && !alreadyReleased`. Label toggles between "Release" / "Released". Card opacity dims when not releasable.
  * `canAfford` → `canRelease`; `alreadyReleased` and `fansMet` introduced as derived booleans.
- `src/components/game/StaffPanel.tsx`:
  * Total rates summary: changed from a 3-column grid of Fans/s · Cash/s · Fame/s (referencing `rates.fans` / `.cash` / `.reputation`) to a 4-column grid of Vocals/s · Dance/s · Charisma/s · Charm/s (referencing `rates.vocals` / `.dance` / `.charisma` / `.charm`).
  * Per-staff production display: replaced the three conditional `base_production_fans` / `base_production_cash` / `base_production_fame` blocks with a single `+{boost_per_sec} {stat}/sec` line.
  * Cost math tooltip and hire button unchanged (`base_cost_cash` and `cost_growth` are still valid StaffDefinition fields — coaches still cost cash to hire).

Verification results:
- `bunx tsc --noEmit`: 0 errors in `src/`. (Pre-existing errors in `examples/websocket/` and `skills/` directories remain — unrelated to this task.)
- `bun run lint`: clean (`eslint .` exits 0, no output).

Notes for the user:
- `staffProductionRate()`'s return type is now `{ vocals: number; dance: number; charisma: number; charm: number }`. Any other code that imported it (none in `src/` besides the three I fixed) would need the same field-name update.
- Coach stat boosts are applied ONLY in `tick()` (live play), NOT in `applyOffline` / `simulateOffline`. If you want offline stat growth, that's a deliberate future change — add the same `staffRate * dtSeconds` block in `applyOffline` (after the fan deltas) and possibly `simulateOffline`. Left out per task scope.
- The fan logistic-saturation block (addressableAudience ceiling on fan growth) was tied to staff fan production, which no longer exists. Song fan production in `passiveProduction` uses the analytical integral and is unaffected by saturation — songs can keep producing fans even when `state.resources.fans` approaches the venue ceiling. Saturation now only matters for click gains (which still use `addressableAudience` in `clickPerform`). This may be intentional for Phase D (songs as the "infinite" passive source) but worth flagging for design review.
- `ResourceBar.tsx` still shows "+0/s" for Cash and Fame when their rates are zero (the `it.rate > 0 ? ... : '—'` check shows an em-dash when rate is exactly 0 — wait, looking again, the condition is `it.rate > 0 ? ... : '—'`, so 0 rates display as "—", which is fine).
- SongsPanel "Released ✓" badge is a simple text indicator; no toast/notification on release. If you want a stronger "just released" affordance, that's a UI polish task for Phase E.

---
Task ID: fix-compile
Agent: subagent (fix-compile)
Task: Fix all TypeScript compilation errors caused by (1) `songProductionRate()` returning `{ fans, cash, fame }` instead of a number, and (2) the `trend` prop being removed from GameShell but still required by `ClickStageProps` and `SongsPanelProps`.

Context:
- A prior change made `engine.songProductionRate()` aggregate fans/cash/fame across released songs and return `{ fans: number; cash: number; fame: number }` (fans = base; cash = base * 0.4; fame = base * 0.05; base = SONG_BASE_RATE_PER_SECOND * quality * decay). This broke every caller that treated the return value as a number.
- A parallel change removed `trend` from GameShell's JSX (it no longer passes `trend` to ClickStage or SongsPanel, and never renders TrendWidget), but the child prop interfaces still declared `trend: TrendSnapshot` as required, and the child components still referenced `trend.genre` / `trend.multiplier` / `trend.phase` for TRENDING badges and per-song trend multipliers.
- `bunx tsc --noEmit` initially reported 7 errors across 4 files: ClickStage.tsx (1), GameShell.tsx (2 — missing `trend` prop on ClickStage + SongsPanel usage), ResourceBar.tsx (2 — `>` operator and `formatNumber` arg type mismatches), SongsPanel.tsx (1 — formatNumber arg). Plus a downstream error in ClickStage line 368 (passing the object to formatNumber).
- Trend lifecycle was already removed from Era I in engine.ts (line 1180 comment: "Trend multiplier removed for Era I — trends unlock in Manager era (Prestige 1+)"). So all trend UI in Era I is dead code; removing it is correct, not just a compilation fix.

Scope decisions (deliberate non-changes for minimal blast radius):
- Did NOT touch `engine.ts`, `types.ts`, or `definitions.ts` per the task constraint. `songProductionRate`'s new return shape and `TrendSnapshot`'s definition are taken as given.
- Did NOT remove `TrendWidget.tsx` — it's a self-contained presentational component that still takes a `trend: TrendSnapshot` prop and compiles fine. It's no longer rendered by GameShell (so it's effectively orphaned in Era I) but leaving it avoids deleting code that may be re-wired in Manager era (Prestige 1+). It does not cause any compilation error.
- Did NOT remove the `trend` field from `useGameEngine`'s return value (line 125) or the `useMemo` that derives it (lines 894-915). It's still computed and exposed; GameShell just no longer consumes it. Harmless and keeps the hook's public API stable for any future Era that re-introduces trends. The `getTrendAt` / `getCurrentTrend` exports in engine.ts also remain.
- Did NOT remove the `formatRate` import in ResourceBar.tsx — it was unused before this task too (noted in the fix-phase-d worklog entry); out of scope, eslint doesn't flag it.
- Updated the stale "Phase D: staff are now coaches... cash/fame come from End Week + events" comments in ClickStage and ResourceBar to reflect the new reality: songs produce all three core resources passively (fans, cash, fame), since `songProductionRate` now returns non-zero cash/fame. The old comments actively contradicted the new engine behavior.

Completed modifications:
- `src/components/game/ClickStage.tsx`:
  * Removed `TrendSnapshot` from the type import (only used in the prop interface).
  * Removed `trend: TrendSnapshot` from `ClickStageProps`.
  * Removed `trend` from the function parameter destructuring.
  * Removed the entire trend mini-badge block (the first `<TooltipProvider>` wrapping the trend genre/multiplier `<Badge>` and its tooltip), leaving the second `<TooltipProvider>` (the fans-vs-audience badge) intact. `Badge` and the Tooltip* imports remain used by that second badge.
  * Updated the section comment from "Venue + trend badge row" to "Venue + audience badge row".
  * Updated the file-level JSDoc to drop "+ trend mini-badge".
  * `const songRate = songProductionRate(state);` then `fansPerSec = songRate.fans`, `cashPerSec = songRate.cash`, `famePerSec = songRate.fame` (was previously `songRate` assigned to `fansPerSec` with cash/fame hardcoded to 0). Replaced the stale Phase D comment with one noting songs produce all three core resources.
- `src/components/game/SongsPanel.tsx`:
  * Removed `TrendSnapshot` from the type import.
  * Removed the `Tooltip`/`TooltipContent`/`TooltipProvider`/`TooltipTrigger` imports and the `Flame` icon import — they were only used by the TRENDING badge.
  * Removed `trend: TrendSnapshot` from `SongsPanelProps` and from the function parameter destructuring.
  * `const songRate = songProductionRate(state);` and the header "Active rate" now displays `formatNumber(songRate.fans)` (was `formatNumber(activeSongRate)` where `activeSongRate` was the whole object).
  * In the release grid: removed the `isTrending` derived boolean, collapsed the card className to a single `border-border/60` (no pink ring), and replaced the `isTrending ? (TRENDING Flame Badge + tooltip) : (genre Badge)` ternary with just the genre `<Badge variant="secondary">`.
  * Removed the `isTrending && (...)` "Now: ×N.NN fan output" pink callout block on each unreleased song card.
  * Removed the "Tip: release in the trending genre for a boost!" line and its `<br />` from the empty-state message.
  * In the released-songs list: removed `trendMult` (per-song `rate` calc is now just `0.5 * song.quality * Math.exp(-ageMs / tauMs)`, no trend multiplier), removed `isTrending`, collapsed the card className to a static `border-border/50` string, removed the inline `×{trendMult.toFixed(2)}` suffix, and removed the trailing "TRENDING" badge in the age/quality row.
  * Updated the file-level JSDoc to drop all trend references (now describes milestone-gated fan-unlock + live fan-production rate, no trend mention).
- `src/components/game/ResourceBar.tsx`:
  * `const songRate = songProductionRate(state);` then `fansPerSec = songRate.fans`, `cashPerSec = songRate.cash`, `famePerSec = songRate.fame` (was `fansPerSec = songRate` with cash/fame hardcoded to 0, which caused the `>` operator and `formatNumber` type errors since `songRate` was the object). Replaced the stale Phase D comment.
  * `xpPerSec` stays 0 (XP still has no passive source).
- `src/components/game/GameShell.tsx`:
  * No code changes needed — `trend` was already not passed to ClickStage/SongsPanel and TrendWidget is already not rendered. The only edit was removing the stale JSDoc line "Above the panels: TrendWidget (full-width) so the active trend is always visible." from the Layout responsibilities comment block, since it now misdescribes the layout.

Verification results:
- `bunx tsc --noEmit`: 0 errors in `src/`. (The 4 pre-existing errors in `examples/websocket/{frontend,server}.ts` and `skills/{image-edit,stock-analysis-skill}/...` remain — they are unrelated to this task and were noted as pre-existing in the fix-phase-d worklog entry.)
- `bun run lint`: clean (`eslint .` exits 0, no output).

Notes for the user:
- The `trend` field is still computed in `useGameEngine` (line 125) and `engine.getCurrentTrend` / `getTrendAt` still exist. They're dormant in Era I (the engine applies no trend multiplier — see engine.ts line 1180). When trends are re-enabled for Manager era (Prestige 1+), GameShell will need to pass `trend` back into the relevant panels (or render `TrendWidget` again). The `TrendWidget.tsx` component is preserved for that purpose.
- Per-song displayed rate in SongsPanel's released list (`0.5 * quality * exp(-age/tau)`) now matches the fans component of `songProductionRate`'s per-song contribution (`SONG_BASE_RATE_PER_SECOND * quality * decay`, where `SONG_BASE_RATE_PER_SECOND = 0.5` and `decay = exp(-age/tau)`). The displayed rate does NOT include the 0.4x cash or 0.05x fame factors — it's labeled as fan rate (pink, "/s"). If you want a richer per-song card showing fans+cash+fame separately, that's a UI polish task.
- ClickStage's compact passive-rate strip now shows non-zero Cash +X/s and Fame +X/s (was "+0/s" while Phase D hardcoded them to 0). This reflects that songs now actually do produce cash and fame passively. If the design intent was for cash/fame to only come from End Week + events (the old Phase D comment), then the engine change to `songProductionRate` returning non-zero cash/fame is the actual design shift — the UI is now correctly mirroring it. Worth a design review if the intent was otherwise.
