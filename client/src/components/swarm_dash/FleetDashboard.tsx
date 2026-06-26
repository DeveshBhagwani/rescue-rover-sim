import React, { useState } from 'react';
import { useFleet } from '../../context/FleetContext';
import { 
  Wifi, 
  Battery, 
  Thermometer, 
  Radio, 
  Navigation, 
  RefreshCw, 
  Play, 
  AlertTriangle,
  Shield,
  Compass
} from 'lucide-react';

interface FleetDashboardProps {
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
}

export const FleetDashboard: React.FC<FleetDashboardProps> = ({ 
  selectedAgentId, 
  setSelectedAgentId 
}) => {
  const { 
    agents, 
    isWsConnected, 
    isRosConnected, 
    sendAgentDriveCommand, 
    triggerSwarmMission, 
    resetSwarm,
    clearAgentWaypoint
  } = useFleet();

  const [driveSpeed, setDriveSpeed] = useState<number>(0.5);

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;

  // Collision alarm: true if any two rovers are closer than 1.4 meters
  const checkCollisionWarning = () => {
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        if (agents[i].type === 'rover' && agents[j].type === 'rover') {
          const dx = agents[i].position[0] - agents[j].position[0];
          const dz = agents[i].position[2] - agents[j].position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < 1.4) return true;
        }
      }
    }
    return false;
  };

  const hasCollisionWarning = checkCollisionWarning();

  const handleManualDrive = (direction: 'forward' | 'backward' | 'left' | 'right' | 'stop') => {
    if (!selectedAgentId) return;
    let linear = 0;
    let angular = 0;

    switch (direction) {
      case 'forward':
        linear = driveSpeed;
        break;
      case 'backward':
        linear = -driveSpeed;
        break;
      case 'left':
        angular = -0.5;
        break;
      case 'right':
        angular = 0.5;
        break;
      case 'stop':
      default:
        linear = 0;
        angular = 0;
        break;
    }
    sendAgentDriveCommand(selectedAgentId, linear, angular);
  };

  return (
    <div className="w-96 bg-dark-bg/95 border-r border-dark-border/80 h-full flex flex-col font-mono text-dark-text overflow-hidden shadow-2xl z-10 glassmorphism">
      {/* Swarm HUD Header */}
      <div className="p-4 border-b border-dark-border/80">
        <h2 className="text-sm font-bold tracking-widest text-cyan-400 flex items-center gap-2">
          <Compass className="w-5 h-5 text-cyan-500 animate-spin-slow" />
          SWARM FLEET COMMAND
        </h2>
        <div className="flex gap-2 mt-3">
          <div className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded border ${
            isWsConnected ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' : 'bg-rose-950/40 border-rose-500/30 text-rose-400'
          }`}>
            <Wifi className="w-3.5 h-3.5" />
            WS GATEWAY
          </div>
          <div className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded border ${
            isRosConnected ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-400' : 'bg-slate-800/40 border-slate-700/30 text-slate-500'
          }`}>
            <Radio className="w-3.5 h-3.5" />
            ROS BRIDGE
          </div>
        </div>
      </div>

      {/* Swarm Status Alerts */}
      {hasCollisionWarning && (
        <div className="mx-4 mt-4 p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg text-amber-400 text-[10px] flex items-start gap-2 animate-pulse">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
          <div>
            <div className="font-bold">COLLISION PREDICTION ALERT</div>
            <div className="opacity-80">Inter-agent distance drops below safety margins. Executing collision avoidance maneuver.</div>
          </div>
        </div>
      )}

      {/* Swarm Agents List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-[10px] text-slate-400 font-bold tracking-wider mb-2">ACTIVE AGENT REPLICAS</div>
        {agents.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          const batteryColor = agent.battery > 50 ? 'text-emerald-400' : agent.battery > 20 ? 'text-amber-400' : 'text-rose-400';
          
          return (
            <div
              key={agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              className={`p-3 rounded-lg border transition duration-200 cursor-pointer flex flex-col gap-2 ${
                isSelected 
                  ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-500/10' 
                  : 'bg-slate-900/50 border-dark-border/40 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${agent.type === 'drone' ? 'bg-purple-500' : 'bg-cyan-500'}`} />
                  <span className="text-xs font-bold text-slate-100">{agent.id.toUpperCase()}</span>
                  <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 uppercase">{agent.type}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  ONLINE
                </div>
              </div>

              {/* Position Info */}
              <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400">
                <div>X: <span className="text-slate-200">{agent.position[0].toFixed(2)}</span></div>
                <div>Z: <span className="text-slate-200">{agent.position[2].toFixed(2)}</span></div>
                <div>H: <span className="text-slate-200">{((agent.heading * 180) / Math.PI).toFixed(0)}°</span></div>
              </div>

              {/* Status Bars */}
              <div className="flex justify-between items-center text-[10px] pt-1 border-t border-dark-border/20">
                <div className="flex items-center gap-1">
                  <Battery className={`w-3.5 h-3.5 ${batteryColor}`} />
                  <span className={batteryColor}>{agent.battery.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>{agent.temperature.toFixed(1)}°C</span>
                </div>
                <div className="text-[9px] text-slate-400">
                  LIDAR: <span className="text-slate-200">{agent.lidarRange.toFixed(1)}m</span>
                </div>
              </div>

              {/* Waypoint Indicator */}
              {agent.targetWaypoint && (
                <div className="flex justify-between items-center bg-cyan-950/20 px-2 py-1 rounded text-[9px] text-cyan-400 border border-cyan-500/20">
                  <div className="flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span>TARGET: [{agent.targetWaypoint.x.toFixed(1)}, {agent.targetWaypoint.z.toFixed(1)}]</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAgentWaypoint(agent.id);
                    }}
                    className="hover:text-rose-400 transition"
                  >
                    CANCEL
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Manual Override controls for selected agent */}
      {selectedAgent && (
        <div className="p-4 border-t border-dark-border/80 bg-slate-900/40">
          <div className="text-[10px] text-slate-400 font-bold mb-3 flex items-center justify-between">
            <span>MANUAL CONTROL OVERRIDE: {selectedAgentId?.toUpperCase()}</span>
            <span className="text-[9px] text-cyan-500 flex items-center gap-0.5">
              <Shield className="w-3 h-3" />
              SAFE DRIVE
            </span>
          </div>

          {/* Drive controller UI */}
          <div className="flex flex-col items-center gap-2">
            <button 
              onClick={() => handleManualDrive('forward')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-dark-border w-16 py-1.5 rounded font-bold text-xs"
            >
              ▲
            </button>
            <div className="flex gap-2">
              <button 
                onClick={() => handleManualDrive('left')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-dark-border w-16 py-1.5 rounded font-bold text-xs"
              >
                ◀
              </button>
              <button 
                onClick={() => handleManualDrive('stop')}
                className="bg-rose-950/60 hover:bg-rose-900/60 text-rose-400 border border-rose-500/30 w-16 py-1.5 rounded font-bold text-xs"
              >
                STOP
              </button>
              <button 
                onClick={() => handleManualDrive('right')}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-dark-border w-16 py-1.5 rounded font-bold text-xs"
              >
                ▶
              </button>
            </div>
            <button 
              onClick={() => handleManualDrive('backward')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-dark-border w-16 py-1.5 rounded font-bold text-xs"
            >
              ▼
            </button>
          </div>

          {/* Speed slider */}
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>DRIVE THROTTLE:</span>
              <span>{Math.round(driveSpeed * 100)}%</span>
            </div>
            <input 
              type="range"
              min="0.1"
              max="1.0"
              step="0.1"
              value={driveSpeed}
              onChange={(e) => setDriveSpeed(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 rounded-lg appearance-none h-1 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Global Swarm Commands */}
      <div className="p-4 border-t border-dark-border/80 bg-slate-950/60 space-y-2.5">
        <button
          onClick={triggerSwarmMission}
          className="w-full bg-cyan-950 hover:bg-cyan-900/80 text-cyan-400 border border-cyan-500/30 py-2.5 rounded-lg text-xs font-bold font-mono transition duration-200 flex items-center justify-center gap-1.5 shadow-lg"
        >
          <Play className="w-4 h-4 text-cyan-400" />
          RUN SWARM CROSSOVER PATHS
        </button>

        <button
          onClick={resetSwarm}
          className="w-full bg-slate-900 hover:bg-slate-800 text-slate-400 border border-dark-border/80 py-2 rounded-lg text-[10px] font-bold font-mono transition duration-200 flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          RESET ALL AGENTS POSITION
        </button>
      </div>
    </div>
  );
};

export default FleetDashboard;
