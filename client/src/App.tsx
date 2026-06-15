import React from 'react';
import { SimulationProvider } from './context/SimulationContext';
import ControlPanel from './components/ControlPanel';
import SceneContainer from './simulation/SceneContainer';
import TelemetryDashboard from './components/TelemetryDashboard';

export const App: React.FC = () => {
  return (
    <SimulationProvider>
      <div className="flex w-screen h-screen overflow-hidden bg-dark-bg font-sans">
        {/* Sidebar Controls Panel */}
        <ControlPanel />

        {/* 3D WebGL Canvas Render Port */}
        <div className="flex-1 h-full relative">
          {/* Header Status Bar (Floating top-left of canvas viewport) */}
          <div className="absolute top-4 left-4 z-10 font-mono text-dark-text pointer-events-none select-none">
            <h1 className="text-xl font-black tracking-wider text-cyan-400">
              RESCUE ROVER SIMULATION
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-cyber-success animate-blink" />
              <span className="text-[10px] text-slate-400">PHASE 1: ENVIRONMENT & WEBGL ACTIVE</span>
            </div>
          </div>

          {/* Interactive WebGL Scene */}
          <SceneContainer />

          {/* Diagnostics Telemetry Overlay */}
          <TelemetryDashboard />
        </div>
      </div>
    </SimulationProvider>
  );
};

export default App;
