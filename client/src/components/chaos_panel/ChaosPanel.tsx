import React, { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Flame, ShieldAlert, WifiOff, Activity, Radio, BatteryCharging, PowerOff } from 'lucide-react';

export const ChaosPanel: React.FC = () => {
  const {
    chaosSensorNoise,
    setChaosSensorNoise,
    chaosPacketLoss,
    setChaosPacketLoss,
    chaosActuatorFreeze,
    setChaosActuatorFreeze,
    chaosFrozenJointIndex,
    setChaosFrozenJointIndex,
    chaosFrozenJointAngle,
    setChaosFrozenJointAngle,
    chaosBatteryDrop,
    setChaosBatteryDrop,
    batteryVoltage
  } = useSimulation();

  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Convert joint index to human-readable label
  const getJointLabel = (idx: number) => {
    const labels = [
      'J1: Base Yaw',
      'J2: Shoulder Pitch',
      'J3: Extension Slide',
      'J4: Wrist Yaw',
      'J5: Wrist Pitch',
      'J6: Wrist Roll'
    ];
    return labels[idx] || `Joint ${idx + 1}`;
  };

  // Convert degrees to radians for state
  const handleAngleChange = (degVal: number) => {
    setChaosFrozenJointAngle((degVal * Math.PI) / 180);
  };

  const currentAngleDeg = Math.round((chaosFrozenJointAngle * 180) / Math.PI);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute top-20 left-4 pointer-events-auto z-30 font-mono text-[10px] font-bold text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-900/40 border border-red-500/50 hover:border-red-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition duration-200 shadow-lg shadow-black/40 animate-pulse glassmorphism"
      >
        <Flame className="w-3.5 h-3.5 text-red-500 animate-bounce" />
        CHAOS PORTAL
      </button>
    );
  }

  return (
    <div className="absolute top-20 left-4 w-76 pointer-events-auto z-30 font-mono text-slate-200 bg-dark-bg/95 border border-red-500/40 rounded-xl p-4 shadow-2xl glassmorphism flex flex-col gap-3.5 select-none max-h-[80vh] overflow-y-auto">
      {/* Panel Header */}
      <div className="flex justify-between items-center pb-2 border-b border-red-500/30">
        <h3 className="text-xs font-black tracking-wider text-red-400 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-red-500 animate-pulse" />
          FAULT INJECTION GATEWAY
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-200 text-xs px-1 rounded hover:bg-slate-800"
        >
          [ESC]
        </button>
      </div>

      {/* Warning Alert Banner */}
      <div className="bg-red-950/20 border border-red-500/25 px-2.5 py-1.5 rounded text-[9px] text-red-300 leading-snug flex gap-1.5 items-start">
        <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5 animate-bounce" />
        <span>CAUTION: Triggering active hardware and network brownouts will degrade SLAM costmaps and joint trajectory execution.</span>
      </div>

      {/* Fault Option 1: Sensor Jitter */}
      <div className="bg-dark-bg/40 p-2.5 rounded border border-dark-border flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-red-400" />
            1. SENSOR NOISE / DRIFT
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={chaosSensorNoise}
              onChange={(e) => setChaosSensorNoise(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-7 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-slate-100"></div>
          </label>
        </div>
        <p className="text-[9px] text-slate-500 leading-normal">
          Adds standard deviation standard variance Gaussian noise to laser scans and base odometry, causing drift.
        </p>
      </div>

      {/* Fault Option 2: Packet Loss */}
      <div className="bg-dark-bg/40 p-2.5 rounded border border-dark-border flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
            <WifiOff className="w-3.5 h-3.5 text-red-400" />
            2. PACKET LOSS / LATENCY
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={chaosPacketLoss}
              onChange={(e) => setChaosPacketLoss(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-7 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-slate-100"></div>
          </label>
        </div>
        <p className="text-[9px] text-slate-500 leading-normal">
          Simulates Bernoulli trial drops (35% loss rate) on commands and telemetry packets.
        </p>
      </div>

      {/* Fault Option 3: Actuator Jam / Locked Joint */}
      <div className="bg-dark-bg/40 p-2.5 rounded border border-dark-border flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-red-400" />
            3. ACTUATOR FREEZE / JAM
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={chaosActuatorFreeze}
              onChange={(e) => setChaosActuatorFreeze(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-7 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-slate-100"></div>
          </label>
        </div>

        {chaosActuatorFreeze && (
          <div className="space-y-2.5 pt-1 border-t border-dark-border/40 text-[10px]">
            {/* Joint index selector */}
            <div className="flex flex-col gap-1">
              <span className="text-slate-400 text-[9px] uppercase">Select Frozen Joint:</span>
              <select
                value={chaosFrozenJointIndex}
                onChange={(e) => setChaosFrozenJointIndex(parseInt(e.target.value))}
                className="bg-slate-900 border border-dark-border rounded px-2 py-1 text-[10px] text-red-400 outline-none focus:border-red-500"
              >
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <option key={`freeze-joint-opt-${idx}`} value={idx}>
                    {getJointLabel(idx)}
                  </option>
                ))}
              </select>
            </div>

            {/* Locked Angle Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[9px] text-slate-400">
                <span>LOCKED ANGLE:</span>
                <span className="text-red-400 font-bold">{currentAngleDeg}°</span>
              </div>
              <input
                type="range"
                min="-90"
                max="90"
                step="5"
                value={currentAngleDeg}
                onChange={(e) => handleAngleChange(parseFloat(e.target.value))}
                className="w-full accent-red-500 bg-slate-800 rounded-lg cursor-pointer h-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Fault Option 4: Battery Depletion */}
      <div className="bg-dark-bg/40 p-2.5 rounded border border-dark-border flex flex-col gap-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
            <BatteryCharging className="w-3.5 h-3.5 text-red-400" />
            4. BATTERY BROWNOUT
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={chaosBatteryDrop}
              onChange={(e) => setChaosBatteryDrop(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-7 h-4 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-slate-100"></div>
          </label>
        </div>
        <div className="flex justify-between items-center text-[9px] text-slate-500">
          <span>Current voltage:</span>
          <span className={`font-bold ${batteryVoltage < 19 ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
            {batteryVoltage.toFixed(1)} V
          </span>
        </div>
        {batteryVoltage < 19 && (
          <div className="bg-red-950/20 text-red-400 border border-red-500/20 p-1.5 rounded text-[8px] flex items-center gap-1 font-bold animate-pulse">
            <PowerOff className="w-3 h-3 text-red-500" />
            LOW POWER BROWN-OUT ACTIVE (VELOCITY LIMITED)
          </div>
        )}
      </div>

      {/* All Fault Toggles Trigger */}
      <button
        onClick={() => {
          setChaosSensorNoise(true);
          setChaosPacketLoss(true);
          setChaosActuatorFreeze(true);
          setChaosBatteryDrop(true);
        }}
        className="w-full py-2 bg-red-600/25 hover:bg-red-600/35 border border-red-500 text-red-300 hover:text-red-200 font-bold rounded-lg transition duration-200 text-[10px]"
      >
        TRIGGER ALL CRITICAL FAULTS
      </button>
    </div>
  );
};

export default ChaosPanel;
