'use client';

/**
 * GameShell — top-level layout for the Idol Idle game.
 *
 * Layout responsibilities:
 *   - Root wrapper: `min-h-screen flex flex-col` so the footer sticks to
 *     the bottom on short viewports and is pushed down naturally on long ones.
 *   - Header: ResourceBar (sticky top) with trophy button → AchievementsModal.
 *   - Main: responsive grid — ClickStage on the left, tabbed panels on the right.
 *   - Footer: mt-auto. Contains EventLog + DebugPanel.
 *   - Floating: GameToaster (bottom-right, fixed), EventModal (on top).
 *
 * All game state comes from useGameEngine; this component is the only place
 * that owns the React <-> engine bridge. Children are presentational.
 */

import { useState } from 'react';
import { useGameEngine } from '@/hooks/useGameEngine';
import { ResourceBar } from './ResourceBar';
import { ClickStage } from './ClickStage';
import { EventModal } from './EventModal';
import { EventLog } from './EventLog';
import { AchievementsModal } from './AchievementsModal';
import { SettingsModal } from './SettingsModal';
import { StatsModal } from './StatsModal';
import { MilestonesModal } from './MilestonesModal';
import { SaveSlotsModal } from './SaveSlotsModal';
import { VenueSelectModal } from './VenueSelectModal';
import { CharacterSelectModal } from './CharacterSelectModal';
import { StatPanel } from './StatPanel';
import { TutorialOverlay } from './TutorialOverlay';
import { GameToaster } from './GameToaster';
import { UpgradesPanel } from './UpgradesPanel';
import { SongsPanel } from './SongsPanel';
import { StaffPanel } from './StaffPanel';
import { PrestigePanel } from './PrestigePanel';
import { OfflineModal } from './OfflineModal';
import { DebugPanel } from './DebugPanel';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export function GameShell() {
  const {
    state,
    actions,
    offlineSummary,
    dismissOfflineSummary,
    progressionInfo,
    activeEvent,
    eventLog,
    achievements,
    unlockedAchievements,
    milestones,
    toasts,
    dismissToast,
    activeSlot,
    chosenArchetype,
    idolStats,
    needsCharacterSelect,
    tutorialStep,
  } = useGameEngine();

  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [milestonesOpen, setMilestonesOpen] = useState(false);
  const [saveSlotsOpen, setSaveSlotsOpen] = useState(false);
  const [venueSelectOpen, setVenueSelectOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ResourceBar
        state={state}
        achievements={achievements}
        unlockedCount={unlockedAchievements.length}
        milestones={milestones}
        activeSlot={activeSlot}
        onOpenAchievements={() => setAchievementsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
        onOpenMilestones={() => setMilestonesOpen(true)}
        onOpenSaveSlots={() => setSaveSlotsOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6 md:gap-6">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
          {/* Left: stage + stats */}
          <div className="flex flex-col items-center gap-3">
            <ClickStage
              state={state}
              onUnlockVenue={actions.unlockVenue}
              onSetVenue={actions.setVenue}
            />
            <StatPanel
              state={state}
              onTrain={actions.trainStat}
              onSocial={actions.socialGathering}
              onGoOut={actions.goOut}
              onStayHome={actions.stayHome}
              onSpecialEvent={actions.doSpecialEvent}
              onEndWeek={() => setVenueSelectOpen(true)}
            />
          </div>
          {/* Right: tabbed panels */}
          <div className="flex h-full min-h-[32rem] flex-col gap-3">
            <div className="flex h-full min-h-0 flex-1 flex-col rounded-2xl border border-border/80 bg-card/70 p-3 shadow-sm sm:p-4">
              <Tabs defaultValue="upgrades" className="flex h-full flex-col gap-3">
                <TabsList className="grid w-full grid-cols-4 self-start">
                  <TabsTrigger value="upgrades" className="text-[10px] sm:text-xs">Upgrades</TabsTrigger>
                  <TabsTrigger value="songs" className="text-[10px] sm:text-xs">Songs</TabsTrigger>
                  <TabsTrigger value="staff" className="text-[10px] sm:text-xs">Staff</TabsTrigger>
                  <TabsTrigger value="prestige" className="text-[10px] sm:text-xs">Prestige</TabsTrigger>
                </TabsList>
                <TabsContent value="upgrades" className="mt-0 min-h-0 flex-1 animate-tab-slide">
                  <UpgradesPanel state={state} actions={actions} />
                </TabsContent>
                <TabsContent value="songs" className="mt-0 min-h-0 flex-1 animate-tab-slide">
                  <SongsPanel state={state} actions={actions} />
                </TabsContent>
                <TabsContent value="staff" className="mt-0 min-h-0 flex-1 animate-tab-slide">
                  <StaffPanel state={state} actions={actions} />
                </TabsContent>
                <TabsContent value="prestige" className="mt-0 min-h-0 flex-1 animate-tab-slide">
                  <PrestigePanel state={state} progressionInfo={progressionInfo} onPrestige={actions.prestige} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto">
        <div className="mx-auto w-full max-w-7xl px-3 py-2 sm:px-4">
          <EventLog entries={eventLog} />
        </div>
        <DebugPanel state={state} actions={actions} />
      </footer>

      <OfflineModal summary={offlineSummary} onDismiss={dismissOfflineSummary} />
      <EventModal event={activeEvent} onResolve={actions.resolveEvent} />
      <CharacterSelectModal
        open={needsCharacterSelect}
        onSelect={actions.chooseArchetype}
      />
      <AchievementsModal
        open={achievementsOpen}
        onOpenChange={setAchievementsOpen}
        achievements={achievements}
        state={state}
      />
      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        state={state}
        onUpdate={actions.updateSettings}
      />
      <StatsModal
        open={statsOpen}
        onOpenChange={setStatsOpen}
        state={state}
      />
      <MilestonesModal
        open={milestonesOpen}
        onOpenChange={setMilestonesOpen}
        milestones={milestones}
      />
      <SaveSlotsModal
        open={saveSlotsOpen}
        onOpenChange={setSaveSlotsOpen}
        activeSlot={activeSlot}
        onSwitchSlot={actions.switchSlot}
        onDeleteSlot={actions.deleteSlot}
        onExport={actions.exportCurrentSave}
        onImport={actions.importToSlot}
      />
      <VenueSelectModal
        open={venueSelectOpen}
        state={state}
        onPerform={(venueId) => {
          if (venueId !== state.current_venue_id) {
            actions.setVenue(venueId);
          }
          actions.performWeek();
          setVenueSelectOpen(false);
        }}
        onUnlock={(venueId) => {
          actions.unlockVenue(venueId);
        }}
        onCancel={() => setVenueSelectOpen(false)}
      />
      <GameToaster toasts={toasts} onDismiss={dismissToast} />
      <TutorialOverlay
        step={tutorialStep}
        onAdvance={actions.advanceTutorial}
        onDismiss={actions.skipTutorial}
      />
    </div>
  );
}
