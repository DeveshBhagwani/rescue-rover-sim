import React, { useState } from 'react';
import { SimulationProvider } from './context/SimulationContext';
import { FleetProvider } from './context/FleetContext';
import ControlPanel from './components/ControlPanel';
import SceneContainer from './simulation/SceneContainer';
import TelemetryDashboard from './components/TelemetryDashboard';
import MiniMap from './components/MiniMap';
import MissionScrubber from './components/analytics/MissionScrubber';
import ChaosPanel from './components/chaos_panel/ChaosPanel';
import TelemetryCharts from './components/analytics/TelemetryCharts';
import FleetDashboard from './components/swarm_dash/FleetDashboard';
import { BarChart2, ChevronDown, ChevronUp, Users, Cpu } from 'lucide-react';

export const App: React.FC = () => {
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isSwarmMode, setIsSwarmMode] = useState<boolean>(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>('rover_1');

  return (
    <SimulationProvider>
      <FleetProvider>
        <div className="flex w-screen h-screen overflow-hidden bg-dark-bg font-sans">
          {/* Sidebar Panel Selection */}
          {isSwarmMode ? (
            <FleetDashboard 
              selectedAgentId={selectedAgentId} 
              setSelectedAgentId={setSelectedAgentId} 
            />
          ) : (
            <ControlPanel />
          )}

          {/* 3D WebGL Canvas Render Port */}
          <div className="flex-1 h-full relative flex flex-col">
            
            <div className="flex-grow relative overflow-hidden">
              {/* Header Status Bar (Floating top-left of canvas viewport) */}
              <div className="absolute top-4 left-4 z-10 font-mono text-dark-text pointer-events-none select-none">
                <h1 className="text-xl font-black tracking-wider text-cyan-400">
                  RESCUE ROVER SIMULATION
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase">
                    {isSwarmMode ? 'PHASE 10: Distributed Swarm Fleet' : 'PHASE 6: TIME-SERIES MISSION REPLAY'}
                  </span>
                </div>
              </div>

              {/* Mode Toggle Switch (Floating top-right of canvas viewport) */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                  onClick={() => setIsSwarmMode(false)}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                    !isSwarmMode
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-900 border-dark-border/80 hover:bg-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5 animate-pulse" />
                  SINGLE AGENT
                </button>
                <button
                  onClick={() => setIsSwarmMode(true)}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono font-bold tracking-wider transition-all duration-200 flex items-center gap-1.5 ${
                    isSwarmMode
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-900 border-dark-border/80 hover:bg-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  SWARM FLEET
                </button>
              </div>

              {/* Interactive WebGL Scene */}
              <SceneContainer isSwarmMode={isSwarmMode} selectedAgentId={selectedAgentId} />

              {/* Mode-specific overlays */}
              {!isSwarmMode && (
                <>
                  {/* Tactical 2D SLAM MiniMap HUD */}
                  <MiniMap />

                  {/* Diagnostics Telemetry Overlay */}
                  <TelemetryDashboard />

                  {/* Chaos Injection Panel Overlay */}
                  <ChaosPanel />
                </>
              )}
            </div>

            {/* Collapsible Mission Analytics Sliding Bottom Drawer (Only in Single Agent view) */}
            {!isSwarmMode && (
              <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-col gap-2 pointer-events-none">
                {/* Toggle Button */}
                <button
                  onClick={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
                  className="self-start pointer-events-auto bg-dark-card/95 hover:bg-slate-800 border border-dark-border/80 px-4 py-2 rounded-lg text-xs font-bold font-mono text-cyan-400 hover:text-cyan-300 transition duration-200 flex items-center gap-1.5 shadow-lg shadow-black/40 glassmorphism"
                >
                  <BarChart2 className="w-4 h-4 text-cyan-500" />
                  {isAnalyticsOpen ? 'HIDE REPLAY ANALYTICS' : 'SHOW REPLAY ANALYTICS'}
                  {isAnalyticsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>

                {/* Drawer Body */}
                {isAnalyticsOpen && (
                  <div className="pointer-events-auto flex flex-col gap-3 w-full max-h-[50vh] overflow-y-auto bg-dark-bg/95 p-4 rounded-xl border border-dark-border/80 shadow-2xl glassmorphism">
                    <MissionScrubber />
                    <TelemetryCharts />
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </FleetProvider>
    </SimulationProvider>
  );
};

export default App;
