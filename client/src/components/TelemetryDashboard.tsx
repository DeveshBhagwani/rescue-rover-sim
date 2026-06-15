import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Cpu, Battery, Wifi, Activity } from 'lucide-react';

export const TelemetryDashboard: React.FC = () => {
  const {
    jointValues,
    lidarRange,
    batteryVoltage,
    temperature,
    isRosConnected,
    isWsConnected
  } = useSimulation();

  return (
    <div className="absolute top-4 right-4 w-80 glassmorphism rounded-xl border border-dark-border p-4 font-mono text-dark-text pointer-events-auto select-none shadow-2xl">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-dark-border">
        <h3 className="text-sm font-bold tracking-wider text-cyan-400 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-cyan-500 animate-pulse" />
          ROVER TELEMETRY
        </h3>
        <span className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-dark-border">
          SYS_OK
        </span>
      </div>

      {/* Connection Status Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-2 bg-dark-bg/40 p-2 rounded border border-dark-border">
          <Wifi className={`w-4 h-4 ${isWsConnected ? 'text-cyber-success' : 'text-cyber-danger'}`} />
          <div className="text-[10px]">
            <div className="text-slate-400">GATEWAY</div>
            <div className="font-semibold">{isWsConnected ? 'CONNECTED' : 'OFFLINE'}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-dark-bg/40 p-2 rounded border border-dark-border">
          <Cpu className={`w-4 h-4 ${isRosConnected ? 'text-cyber-success' : 'text-cyber-danger'}`} />
          <div className="text-[10px]">
            <div className="text-slate-400">ROS2 CORE</div>
            <div className="font-semibold">{isRosConnected ? 'ACTIVE' : 'STANDBY'}</div>
          </div>
        </div>
      </div>

      {/* Diagnostics Readouts */}
      <div className="space-y-3">
        {/* Battery Health */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-slate-300">
              <Battery className="w-3.5 h-3.5" /> Voltage
            </span>
            <span className={batteryVoltage < 22 ? 'text-cyber-danger font-bold' : 'text-slate-100'}>
              {batteryVoltage.toFixed(1)} V
            </span>
          </div>
          <div className="w-full bg-dark-border h-1 rounded overflow-hidden">
            <div 
              className={`h-full ${batteryVoltage < 22 ? 'bg-cyber-danger' : 'bg-cyber-success'}`}
              style={{ width: `${Math.min(100, Math.max(0, ((batteryVoltage - 20) / 4.4) * 100))}%` }}
            />
          </div>
        </div>

        {/* Lidar distance */}
        <div className="bg-dark-bg/20 p-2 rounded border border-dark-border">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300">PROXIMITY (LIDAR)</span>
            <span className="text-cyan-400 font-bold">{lidarRange.toFixed(3)} m</span>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[...Array(8)].map((_, i) => {
              const activeCount = Math.floor(Math.max(1, Math.min(8, (lidarRange / 3) * 8)));
              const isActive = i < activeCount;
              return (
                <div 
                  key={`lidar-bar-${i}`}
                  className={`h-1.5 flex-1 rounded ${isActive ? 'bg-cyan-500' : 'bg-dark-border'}`}
                />
              );
            })}
          </div>
        </div>

        {/* Core Temperature */}
        <div className="flex justify-between text-xs py-1 border-t border-dark-border/40">
          <span className="text-slate-300">CORE TEMPERATURE</span>
          <span className="text-amber-400">{temperature.toFixed(1)} °C</span>
        </div>

        {/* Joint Vectors Summary */}
        <div className="border-t border-dark-border pt-2">
          <div className="text-[10px] text-slate-400 mb-1">JOINT COORDINATE SYSTEM (Q)</div>
          <div className="grid grid-cols-3 gap-1 text-[10px] bg-dark-bg/60 p-2 rounded border border-dark-border/60">
            {jointValues.map((val, idx) => (
              <div key={`telemetry-joint-${idx}`} className="flex flex-col">
                <span className="text-slate-400">Q{idx + 1}</span>
                <span className="text-cyan-400 font-bold truncate">{val.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelemetryDashboard;
