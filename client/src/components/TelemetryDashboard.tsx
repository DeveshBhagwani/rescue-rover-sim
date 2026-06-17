import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Cpu, Battery, Wifi, Activity, ShieldAlert, Compass } from 'lucide-react';

export const TelemetryDashboard: React.FC = () => {
  const {
    jointValues,
    endEffectorPos,
    jointTorques,
    manipulability,
    // Base states
    roverPosition,
    roverHeading,
    navigationPath,
    targetWaypoint,
    isAutonomousDriving,
    lidarRange,
    batteryVoltage,
    temperature,
    isRosConnected,
    isWsConnected,
    controlMode,
    // Perception & Fusion additions
    isEStopped,
    armCollisionWarning,
    fusedTargetPos,
    rawCameraPos,
    rawLidarPos,
    graspingForce
  } = useSimulation();

  // Singularity status styling
  const getSingularityStatus = () => {
    if (manipulability > 0.08) {
      return { label: 'NOMINAL', style: 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400' };
    } else if (manipulability > 0.025) {
      return { label: 'APPROACHING', style: 'bg-amber-950/60 border-amber-500/40 text-amber-400 animate-pulse' };
    } else {
      return { label: 'SINGULAR LIMIT', style: 'bg-red-950/60 border-red-500/40 text-red-400 animate-pulse font-bold' };
    }
  };

  const singularity = getSingularityStatus();

  // Loaded Joint Specifications
  const loadedJoints = [
    { index: 1, label: 'J2 Shoulder Torque', max: 50.0, unit: 'N·m' },
    { index: 2, label: 'J3 Linear Slide Force', max: 40.0, unit: 'N' },
    { index: 4, label: 'J5 Wrist Pitch Torque', max: 5.0, unit: 'N·m' }
  ];

  // Heading conversion to degrees
  const headingDeg = ((roverHeading * 180) / Math.PI) % 360;
  const normalizedHeading = headingDeg < 0 ? headingDeg + 360 : headingDeg;

  return (
    <div className="absolute top-4 right-4 w-80 glassmorphism rounded-xl border border-dark-border p-4 font-mono text-dark-text pointer-events-auto select-none shadow-2xl overflow-y-auto max-h-[92vh]">
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
      <div className="grid grid-cols-2 gap-2 mb-3">
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

      {/* Flashing Proximity / Safety Alarms */}
      {(isEStopped || armCollisionWarning) && (
        <div className="space-y-1.5 mb-3 font-mono">
          {isEStopped && (
            <div className="bg-red-950/70 border border-red-500/80 text-red-400 px-3 py-1.5 rounded-lg text-[10px] font-bold animate-pulse flex items-center gap-1.5 uppercase leading-snug">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 animate-bounce" />
              <span>BASE COLLISION SHUTDOWN (E-STOP)</span>
            </div>
          )}
          {armCollisionWarning && (
            <div className="bg-amber-950/70 border border-amber-500/80 text-amber-400 px-3 py-1.5 rounded-lg text-[10px] font-bold animate-pulse flex items-center gap-1.5 uppercase leading-snug">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span>ARM COLLISION LIMIT WARNING (&lt;0.05m)</span>
            </div>
          )}
        </div>
      )}

      {/* SECTION: Mobile Base Position HUD */}
      <div className="bg-dark-bg/60 p-2.5 mb-3 rounded border border-dark-border/85 text-xs">
        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-2 uppercase tracking-wider">
          <span>Rover Coordinate Base</span>
          <Compass className="w-3.5 h-3.5 text-cyan-500" />
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center text-slate-200 mb-2">
          <div className="bg-dark-bg/85 p-1 rounded border border-dark-border/30">
            <div className="text-[8px] text-slate-500 font-bold">POS X</div>
            <div className="font-bold text-cyan-400 font-mono text-xs">{roverPosition[0].toFixed(2)}m</div>
          </div>
          <div className="bg-dark-bg/85 p-1 rounded border border-dark-border/30">
            <div className="text-[8px] text-slate-500 font-bold">POS Z</div>
            <div className="font-bold text-cyan-400 font-mono text-xs">{roverPosition[2].toFixed(2)}m</div>
          </div>
          <div className="bg-dark-bg/85 p-1 rounded border border-dark-border/30">
            <div className="text-[8px] text-slate-500 font-bold">HEADING</div>
            <div className="font-bold text-cyan-400 font-mono text-xs">{normalizedHeading.toFixed(0)}°</div>
          </div>
        </div>

        {/* Autonomous route display */}
        {isAutonomousDriving && targetWaypoint ? (
          <div className="border-t border-dark-border/40 pt-2 flex flex-col gap-1 text-[10px]">
            <div className="flex justify-between text-purple-300 font-bold">
              <span>WAYPOINT DRIVE:</span>
              <span>ACTIVE</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Goal Coord:</span>
              <span>[{targetWaypoint.x.toFixed(1)}, {targetWaypoint.z.toFixed(1)}]</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Remaining nodes:</span>
              <span>{navigationPath ? navigationPath.length : 0}</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-[9px] text-slate-500">
            DRIVE STATUS: STANDBY
          </div>
        )}
      </div>

      {/* Control Mode HUD Indicator */}
      <div className="bg-dark-bg/40 p-2 mb-3 rounded border border-dark-border/80 flex justify-between items-center text-xs">
        <span className="text-slate-400">CONTROL MODE:</span>
        <span className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
          controlMode === 'task' 
            ? 'bg-purple-950/60 border border-purple-500/40 text-purple-400' 
            : 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-400'
        }`}>
          {controlMode === 'task' ? 'TASK (IK SOLVER)' : 'JOINT (MANUAL)'}
        </span>
      </div>

      {/* Singularity / Manipulability Index */}
      <div className="bg-dark-bg/40 p-2.5 mb-3 rounded border border-dark-border/80 text-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="text-slate-400">SINGULARITY INDEX:</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${singularity.style}`}>
            {singularity.label}
          </span>
        </div>
        <div className="flex justify-between items-center mt-1.5 font-mono">
          <span className="text-[10px] text-slate-500">Yoshikawa w:</span>
          <span className="text-cyan-400 font-bold">{manipulability.toFixed(5)}</span>
        </div>
        {manipulability <= 0.025 && (
          <div className="flex items-start gap-1.5 text-[10px] text-red-400 bg-red-950/20 border border-red-500/25 p-1.5 rounded mt-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-500 animate-bounce" />
            <span>Kinematic lock detected. Actuator speeds limited to prevent joint infinite velocity calculation error.</span>
          </div>
        )}
      </div>

      {/* Active End-Effector Tip Coordinates via FK */}
      <div className="bg-dark-bg/60 p-2.5 mb-3 rounded border border-dark-border/80 font-mono text-xs">
        <div className="text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider">
          End-Effector Pose (FK Solve)
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-slate-200">
          <div className="bg-dark-bg/85 p-1 rounded border border-dark-border/30">
            <div className="text-[9px] text-slate-500 font-bold">X</div>
            <div className="font-bold text-cyan-400 font-mono text-xs truncate">
              {endEffectorPos.x.toFixed(3)}
            </div>
          </div>
          <div className="bg-dark-bg/85 p-1 rounded border border-dark-border/30">
            <div className="text-[9px] text-slate-500 font-bold">Y</div>
            <div className="font-bold text-cyan-400 font-mono text-xs truncate">
              {endEffectorPos.y.toFixed(3)}
            </div>
          </div>
          <div className="bg-dark-bg/85 p-1 rounded border border-dark-border/30">
            <div className="text-[9px] text-slate-500 font-bold">Z</div>
            <div className="font-bold text-cyan-400 font-mono text-xs truncate">
              {endEffectorPos.z.toFixed(3)}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Perception & Sensor Fusion */}
      <div className="bg-dark-bg/60 p-2.5 mb-3 rounded border border-dark-border/80 text-xs">
        <div className="flex justify-between items-center text-[10px] text-slate-400 mb-2 uppercase tracking-wider">
          <span>Target tracking (Kalman)</span>
          <span className="text-emerald-400 font-bold text-[9px] tracking-wide animate-pulse">LOCKED</span>
        </div>

        {/* Fused coordinates */}
        <div className="bg-dark-bg/85 p-2 rounded border border-dark-border/30 mb-2">
          <div className="text-[8px] text-slate-500 font-bold mb-1 uppercase font-mono">Fused position estimate</div>
          <div className="grid grid-cols-3 gap-1 text-[9px] text-center font-bold text-emerald-400 font-mono">
            <div className="bg-emerald-950/20 px-1 py-0.5 rounded border border-emerald-500/20 truncate">X: {fusedTargetPos[0].toFixed(2)}</div>
            <div className="bg-emerald-950/20 px-1 py-0.5 rounded border border-emerald-500/20 truncate">Y: {fusedTargetPos[1].toFixed(2)}</div>
            <div className="bg-emerald-950/20 px-1 py-0.5 rounded border border-emerald-500/20 truncate">Z: {fusedTargetPos[2].toFixed(2)}</div>
          </div>
        </div>

        {/* Raw Noisy Measurements comparison */}
        <div className="grid grid-cols-2 gap-1.5 text-[8px] font-mono mb-2">
          <div className="bg-dark-bg/85 p-1 rounded border border-dark-border/20 text-red-300">
            <div className="text-[7px] text-slate-500 font-bold uppercase mb-0.5">Raw Cam (Angular)</div>
            <div className="truncate">[{rawCameraPos[0].toFixed(2)}, {rawCameraPos[1].toFixed(2)}, {rawCameraPos[2].toFixed(2)}]</div>
          </div>
          <div className="bg-dark-bg/85 p-1 rounded border border-dark-border/20 text-blue-300">
            <div className="text-[7px] text-slate-500 font-bold uppercase mb-0.5">Raw Lidar (Range)</div>
            <div className="truncate">[{rawLidarPos[0].toFixed(2)}, {rawLidarPos[1].toFixed(2)}, {rawLidarPos[2].toFixed(2)}]</div>
          </div>
        </div>

        {/* Grasp Force feedback */}
        <div className="border-t border-dark-border/40 pt-2 flex justify-between items-center text-[10px]">
          <span className="text-slate-400 uppercase">Grasping Force:</span>
          {graspingForce > 0.1 ? (
            <span className="text-cyan-400 font-bold animate-pulse font-mono">
              {graspingForce.toFixed(1)} N
            </span>
          ) : (
            <span className="text-slate-500 font-mono">0.0 N (OPEN)</span>
          )}
        </div>
      </div>

      {/* Dynamic Gravity Joint Loads */}
      <div className="bg-dark-bg/60 p-2.5 mb-3 rounded border border-dark-border/80 text-xs">
        <div className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider">
          Gravity Joint Loads
        </div>
        <div className="space-y-2">
          {loadedJoints.map((joint) => {
            const currentVal = jointTorques[joint.index] || 0.0;
            const percent = Math.min(100, (currentVal / joint.max) * 100);
            
            return (
              <div key={`load-${joint.index}`}>
                <div className="flex justify-between text-[10px] text-slate-300 mb-0.5">
                  <span>{joint.label}</span>
                  <span className={percent > 85 ? 'text-cyber-danger font-bold' : 'text-slate-400'}>
                    {currentVal.toFixed(1)} {joint.unit}
                  </span>
                </div>
                <div className="w-full bg-dark-border h-1 rounded overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      percent > 85 ? 'bg-cyber-danger' : percent > 50 ? 'bg-cyber-warning' : 'bg-cyber-success'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Diagnostics Readouts */}
      <div className="space-y-2">
        {/* Battery Health */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-slate-300">
              <Battery className="w-3.5 h-3.5" /> Battery
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
        <div className="border-t border-dark-border pt-1.5">
          <div className="text-[10px] text-slate-400 mb-1">JOINT VECTOR (Q)</div>
          <div className="grid grid-cols-6 gap-1 text-[10px] bg-dark-bg/60 p-1.5 rounded border border-dark-border/60 text-center">
            {jointValues.map((val, idx) => (
              <div key={`telemetry-joint-${idx}`} className="flex flex-col border-r border-dark-border/30 last:border-0">
                <span className="text-slate-500 text-[8px]">Q{idx + 1}</span>
                <span className="text-cyan-400 font-bold font-mono truncate">{val.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelemetryDashboard;
