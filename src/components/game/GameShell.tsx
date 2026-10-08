'use client';

/**
 * GameShell — top-level layout for the Idol Idle game.
 *
 * Layout responsibilities:
 *   - Root wrapper: `min-h-screen flex flex-col` so the footer sticks to
 *     the bottom on short viewports and is pushed down naturally on long ones.
 *   - Header: ResourceBar (sticky top).
 *   - Main: responsive grid — ClickStage on the left, tabbed panels on the right.
 *   - Footer: mt-auto, contains the collapsible DebugPanel.
 *
 * All game state comes from useGameEngine; this component is the only place
 * that owns the React <-> engine bridge. Children are presentational.
 */

import { useGameEngine } from '@/hooks/useGameEngine';
import { ResourceBar } from './ResourceBar';
import { ClickStage } from './ClickStage';
import { UpgradesPanel } from './UpgradesPanel';
import { SongsPanel } from './SongsPanel';
import { StaffPanel } from './StaffPanel';
import { VenuesPanel } from './VenuesPanel';
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
  const { state, actions, offlineSummary, dismissOfflineSummary, prestigeInfo } =
    useGameEngine();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ResourceBar state={state} />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6 md:gap-6">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
          {/* Left: stage */}
          <div className="flex items-start justify-center">
            <ClickStage state={state} onClick={actions.click} />
          </div>
          {/* Right: tabbed panels */}
          <div className="flex h-full min-h-[32rem] flex-col rounded-2xl border border-border/80 bg-card/70 p-3 shadow-sm sm:p-4">
            <Tabs defaultValue="upgrades" className="flex h-full flex-col gap-3">
              <TabsList className="grid w-full grid-cols-5 self-start">
                <TabsTrigger value="upgrades" className="text-[10px] sm:text-xs">Upgrades</TabsTrigger>
                <TabsTrigger value="songs" className="text-[10px] sm:text-xs">Songs</TabsTrigger>
                <TabsTrigger value="staff" className="text-[10px] sm:text-xs">Staff</TabsTrigger>
                <TabsTrigger value="venues" className="text-[10px] sm:text-xs">Venues</TabsTrigger>
                <TabsTrigger value="prestige" className="text-[10px] sm:text-xs">Prestige</TabsTrigger>
              </TabsList>
              <TabsContent value="upgrades" className="mt-0 min-h-0 flex-1">
                <UpgradesPanel state={state} actions={actions} />
              </TabsContent>
              <TabsContent value="songs" className="mt-0 min-h-0 flex-1">
                <SongsPanel state={state} actions={actions} />
              </TabsContent>
              <TabsContent value="staff" className="mt-0 min-h-0 flex-1">
                <StaffPanel state={state} actions={actions} />
              </TabsContent>
              <TabsContent value="venues" className="mt-0 min-h-0 flex-1">
                <VenuesPanel state={state} actions={actions} />
              </TabsContent>
              <TabsContent value="prestige" className="mt-0 min-h-0 flex-1">
                <PrestigePanel state={state} prestigeInfo={prestigeInfo} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <footer className="mt-auto">
        <DebugPanel state={state} actions={actions} />
      </footer>

      <OfflineModal summary={offlineSummary} onDismiss={dismissOfflineSummary} />
    </div>
  );
}
