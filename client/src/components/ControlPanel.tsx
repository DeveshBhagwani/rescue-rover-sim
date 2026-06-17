import React, { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import JointSlider from './JointSlider';
import { RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, Sliders, Target, Eye, EyeOff, Play, Zap, Navigation, Settings } from 'lucide-react';

export const ControlPanel: React.FC = () => {
  const { 
    jointValues, 
    setJointValue, 
    targetX,
    targetY,
    targetZ,
    targetRoll,
    targetPitch,
    targetYaw,
    setTargetCartesian,
    controlMode,
    setControlMode,
    isWorkspaceVisible,
    setIsWorkspaceVisible,
    isSmoothMode,
    setIsSmoothMode,
    isTrajectoryActive,
    triggerTrajectory,
    // Navigation states & gains
    isAutonomousDriving,
    setIsAutonomousDriving,
    Kp_steer,
    setKpSteer,
    Kp_dist,
    setKpDist,
    sendDriveCommand, 
    resetSimulation,
    // Calibration & Perception additions
    jointOffsets,
    saveCalibrationOffsets,
    isGrasping,
    setIsGrasping,
    isEStopped,
    resetEStop
  } = useSimulation();

  // Tab navigation inside control panel
  const [activeTab, setActiveTab] = useState<'control' | 'calibration'>('control');
  
  // Local state for calibration sliders in degrees
  const [localOffsets, setLocalOffsets] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  // Keep local offsets updated from context
  useEffect(() => {
    setLocalOffsets(jointOffsets.map(r => Number((r * 180 / Math.PI).toFixed(1))));
  }, [jointOffsets, activeTab]);

  const handleLocalOffsetChange = (idx: number, val: number) => {
    setLocalOffsets(prev => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleSaveCalibration = async () => {
    const radOffsets = localOffsets.map(d => d * Math.PI / 180);
    try {
      await saveCalibrationOffsets(radOffsets);
      alert('Presaved joint offsets written to MongoDB!');
    } catch (e) {
      alert('DB Connection Error. Presets fallback active.');
    }
  };

  // Joint Space specifications
  const jointSpecs = [
    { label: 'J1: Base Yaw (Revolute)', min: -Math.PI, max: Math.PI, unit: 'rad' },
    { label: 'J2: Shoulder Pitch (Revolute)', min: -Math.PI / 2, max: Math.PI / 2, unit: 'rad' },
    { label: 'J3: Extension (Prismatic)', min: 0.0, max: 0.15, unit: 'm', step: 0.005 },
    { label: 'J4: Wrist Yaw (Spherical Y)', min: -Math.PI, max: Math.PI, unit: 'rad' },
    { label: 'J5: Wrist Pitch (Spherical X)', min: -Math.PI / 2, max: Math.PI / 2, unit: 'rad' },
    { label: 'J6: Wrist Roll (Spherical Z)', min: -Math.PI, max: Math.PI, unit: 'rad' }
  ];

  const handleDrive = (linear: number, angular: number) => {
    sendDriveCommand(linear, angular);
  };

  return (
    <div className="w-80 h-full flex flex-col glassmorphism border-r border-dark-border p-4 text-dark-text overflow-y-auto select-none">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold font-mono tracking-wider text-cyan-400">COMMAND PORTAL</h2>
        <button
          onClick={resetSimulation}
          className="p-1.5 rounded-lg bg-dark-card hover:bg-slate-700 border border-dark-border transition duration-200"
          title="Reset Joint to Home Position"
        >
          <RotateCcw className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* Portal Tabs Selector */}
      <div className="flex bg-dark-bg/85 p-1 rounded-lg border border-dark-border mb-4 font-mono text-[10px]">
        <button
          onClick={() => setActiveTab('control')}
          className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'control'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          ACTUATION
        </button>
        <button
          onClick={() => setActiveTab('calibration')}
          className={`flex-1 py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'calibration'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          CALIBRATION
        </button>
      </div>

      {activeTab === 'calibration' ? (
        /* CALIBRATION VIEW presets inputs */
        <div className="flex-grow flex flex-col font-mono text-xs">
          <div className="mb-4 bg-amber-950/20 border border-amber-500/30 p-3 rounded-lg leading-relaxed text-[11px] text-amber-200">
            <h4 className="font-bold mb-1 flex items-center gap-1 text-[11px]">
              <Settings className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              JOINT ZERO OFFSET PRESETS
            </h4>
            Systematic offsets corrected in real-time FK/IK math transforms. Adjust values below in degrees.
          </div>

          <div className="space-y-4 mb-6">
            {localOffsets.map((offset, idx) => (
              <div key={`offset-input-${idx}`} className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-400 text-[10px]">
                  <span>JOINT {idx + 1} ZERO CORRECTION</span>
                  <span className="text-amber-400 font-bold">{offset.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="0.5"
                  value={offset}
                  onChange={(e) => handleLocalOffsetChange(idx, parseFloat(e.target.value))}
                  className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer appearance-none h-1"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSaveCalibration}
            className="w-full py-2.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/35 border border-amber-500 text-amber-300 hover:text-amber-200 font-bold transition duration-200 flex items-center justify-center gap-1.5 text-xs mb-4"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            SAVE PRESETS TO MONGO
          </button>
        </div>
      ) : (
        /* STANDARD OPERATION CONTROLS VIEW */
        <>
          {/* E-Stop Flash Alert Header */}
          {isEStopped && (
            <div className="bg-red-950/80 border border-red-500 text-red-200 p-2.5 rounded-lg text-center text-[10px] font-bold animate-pulse tracking-wide mb-3 flex flex-col gap-1">
              <span>⚠️ SAFETY COMPROMISED: BASE E-STOP ACTIVE</span>
              <button 
                onClick={resetEStop} 
                className="mt-1 bg-red-800 hover:bg-red-700 text-white rounded py-1 px-2 font-mono text-[9px] uppercase border border-red-500 active:scale-95 transition-all"
              >
                RELEASE E-STOP LATCH
              </button>
            </div>
          )}

          {/* Grasp Canister Actuation Button */}
          <div className="mb-4">
            <button
              onClick={() => setIsGrasping(!isGrasping)}
              className={`w-full py-2.5 rounded-lg border font-bold text-xs transition duration-200 flex items-center justify-center gap-1.5 ${
                isGrasping 
                  ? 'bg-cyan-500/25 border-cyan-500 text-cyan-300 hover:bg-cyan-500/35' 
                  : 'bg-dark-card border-dark-border text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              <Target className="w-4 h-4 text-cyan-400" />
              {isGrasping ? 'CLAMP RETRACTED (GRASP)' : 'OPEN CLAW GRIPPER'}
            </button>
          </div>

          {/* Control Mode Toggle Tabs */}
          <div className="flex bg-dark-bg/60 p-1 rounded-lg border border-dark-border mb-4 font-mono text-xs">
            <button
              onClick={() => setControlMode('joint')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${
                controlMode === 'joint' 
                  ? 'bg-cyan-500/25 border border-cyan-500/50 text-cyan-300 font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              JOINT SPACE
            </button>
            <button
              onClick={() => setControlMode('task')}
              className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md transition-all ${
                controlMode === 'task' 
                  ? 'bg-purple-500/25 border border-purple-500/50 text-purple-300 font-bold' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              TASK SPACE
            </button>
          </div>

          {/* Toggles Panel */}
          <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Workspace Visualizer */}
        <button
          onClick={() => setIsWorkspaceVisible(!isWorkspaceVisible)}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border font-mono text-[10px] transition duration-200 ${
            isWorkspaceVisible 
              ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-400' 
              : 'bg-dark-card border-dark-border text-slate-400 hover:border-slate-600'
          }`}
        >
          {isWorkspaceVisible ? <EyeOff className="w-4 h-4 mb-1" /> : <Eye className="w-4 h-4 mb-1" />}
          WORKSPACE BOUNDS
        </button>

        {/* Trajectory Interpolation Mode */}
        <button
          onClick={() => setIsSmoothMode(!isSmoothMode)}
          className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border font-mono text-[10px] transition duration-200 ${
            isSmoothMode 
              ? 'bg-purple-950/40 border-purple-500/40 text-purple-400' 
              : 'bg-dark-card border-dark-border text-slate-400 hover:border-slate-600'
          }`}
        >
          {isSmoothMode ? <Zap className="w-4 h-4 mb-1" /> : <Play className="w-4 h-4 mb-1" />}
          QUINTIC SMOOTHING
        </button>
      </div>

      {/* Active Trajectory Overlay Indicator */}
      {isTrajectoryActive && (
        <div className="bg-purple-950/60 border border-purple-500/40 text-purple-300 font-mono text-xs text-center py-2 rounded-lg mb-4 animate-pulse font-bold tracking-wider">
          PATH PLANNING ACTIVE...
        </div>
      )}

      {/* SECTION: Arm Actuation Controllers */}
      <div className="mb-6">
        <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest mb-4 border-b border-dark-border pb-1">
          {controlMode === 'joint' ? 'Manual Joint Sliders' : 'Cartesian IK Targets'}
        </h3>

        {controlMode === 'joint' ? (
          /* JOINT MODE: Display J1-J6 sliders */
          jointSpecs.map((spec, i) => (
            <JointSlider
              key={`slider-${i}`}
              label={spec.label}
              min={spec.min}
              max={spec.max}
              unit={spec.unit}
              step={spec.step || 0.01}
              value={jointValues[i] !== undefined ? jointValues[i] : 0}
              onChange={(val) => setJointValue(i, val)}
            />
          ))
        ) : (
          /* TASK MODE: Display Cartesian target sliders */
          <div className="space-y-4">
            <JointSlider
              label="Target X (Left/Right)"
              min={-0.6}
              max={0.6}
              unit="m"
              step={0.01}
              value={targetX}
              onChange={(val) => setTargetCartesian(val, targetY, targetZ, targetRoll, targetPitch, targetYaw)}
            />
            <JointSlider
              label="Target Y (Elevation)"
              min={0.15}
              max={0.85}
              unit="m"
              step={0.01}
              value={targetY}
              onChange={(val) => setTargetCartesian(targetX, val, targetZ, targetRoll, targetPitch, targetYaw)}
            />
            <JointSlider
              label="Target Z (Forward/Back)"
              min={-0.6}
              max={0.6}
              unit="m"
              step={0.01}
              value={targetZ}
              onChange={(val) => setTargetCartesian(targetX, targetY, val, targetRoll, targetPitch, targetYaw)}
            />
            
            <div className="pt-2 border-t border-dark-border/40">
              <div className="text-[10px] text-slate-500 font-mono mb-2">WRIST ORIENTATION TARGETS</div>
              <JointSlider
                label="Wrist Yaw (Y)"
                min={-Math.PI}
                max={Math.PI}
                unit="rad"
                step={0.05}
                value={targetYaw}
                onChange={(val) => setTargetCartesian(targetX, targetY, targetZ, targetRoll, targetPitch, val)}
              />
              <JointSlider
                label="Wrist Pitch (X)"
                min={-Math.PI / 2}
                max={Math.PI / 2}
                unit="rad"
                step={0.05}
                value={targetPitch}
                onChange={(val) => setTargetCartesian(targetX, targetY, targetZ, targetRoll, val, targetYaw)}
              />
              <JointSlider
                label="Wrist Roll (Z)"
                min={-Math.PI}
                max={Math.PI}
                unit="rad"
                step={0.05}
                value={targetRoll}
                onChange={(val) => setTargetCartesian(targetX, targetY, targetZ, val, targetPitch, targetYaw)}
              />
            </div>

            {/* Manually trigger trajectory button */}
            <button
              onClick={triggerTrajectory}
              disabled={isTrajectoryActive}
              className={`w-full py-2.5 rounded-lg border font-mono font-bold text-xs transition duration-200 mt-2 flex items-center justify-center gap-1.5 ${
                isTrajectoryActive 
                  ? 'bg-purple-950/40 border-purple-500/20 text-purple-500 cursor-not-allowed' 
                  : 'bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/35 hover:border-purple-500'
              }`}
            >
              <Zap className="w-4 h-4" />
              PLAN & EXECUTE SPLINE
            </button>
          </div>
        )}
      </div>

      {/* SECTION: PID Steering Tuner */}
      <div className="mb-4 pt-4 border-t border-dark-border/60">
        <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest mb-3 border-b border-dark-border pb-1">
          PID Navigation Gains
        </h3>
        <div className="space-y-1">
          <JointSlider
            label="Kp Steering Alignment"
            min={0.5}
            max={3.0}
            unit=""
            step={0.1}
            value={Kp_steer}
            onChange={(val) => setKpSteer(val)}
          />
          <JointSlider
            label="Kp Position Drive"
            min={0.5}
            max={2.5}
            unit=""
            step={0.1}
            value={Kp_dist}
            onChange={(val) => setKpDist(val)}
          />
        </div>
      </div>

      {/* SECTION: Mobile Rover Driving */}
      <div className="mt-auto pt-4 border-t border-dark-border/60">
        <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest mb-3 border-b border-dark-border pb-1">
          Mobile Base Drive
        </h3>

        {/* Autonomous drive abort status banner */}
        {isAutonomousDriving ? (
          <button
            onClick={() => setIsAutonomousDriving(false)}
            className="w-full flex items-center justify-center gap-1.5 py-2 mb-4 bg-red-950/40 border border-red-500/40 text-red-400 rounded-lg font-mono text-xs font-bold animate-pulse hover:bg-red-900/40"
          >
            <Navigation className="w-4 h-4 text-red-400 animate-spin" />
            ABORT AUTONOMOUS DRIVE
          </button>
        ) : (
          <div className="w-full text-center text-[9px] text-slate-500 font-mono mb-4">
            Click ground map to drive autonomously
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 w-full max-w-[200px] mx-auto mb-4">
          <div />
          <button 
            onClick={() => handleDrive(0.5, 0.0)} 
            className="flex items-center justify-center p-3 rounded-lg bg-dark-card border border-dark-border hover:bg-slate-700 hover:border-cyan-500 text-slate-200 active:scale-95 transition-all"
          >
            <ArrowUp className="w-5 h-5 text-cyan-400" />
          </button>
          <div />

          <button 
            onClick={() => handleDrive(0.0, 1.0)} 
            className="flex items-center justify-center p-3 rounded-lg bg-dark-card border border-dark-border hover:bg-slate-700 hover:border-cyan-500 text-slate-200 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-cyan-400" />
          </button>
          <button 
            onClick={() => handleDrive(0.0, 0.0)} 
            className="flex items-center justify-center p-3 rounded-lg bg-red-950/40 border border-red-500/30 hover:bg-red-900/60 text-slate-200 active:scale-95 transition-all"
            title="E-Stop Base"
          >
            <Square className="w-5 h-5 text-red-500 fill-red-500" />
          </button>
          <button 
            onClick={() => handleDrive(0.0, -1.0)} 
            className="flex items-center justify-center p-3 rounded-lg bg-dark-card border border-dark-border hover:bg-slate-700 hover:border-cyan-500 text-slate-200 active:scale-95 transition-all"
          >
            <ArrowRight className="w-5 h-5 text-cyan-400" />
          </button>

          <div />
          <button 
            onClick={() => handleDrive(-0.5, 0.0)} 
            className="flex items-center justify-center p-3 rounded-lg bg-dark-card border border-dark-border hover:bg-slate-700 hover:border-cyan-500 text-slate-200 active:scale-95 transition-all"
          >
            <ArrowDown className="w-5 h-5 text-cyan-400" />
          </button>
          <div />
        </div>
      </div>
      </>
      )}
    </div>
  );
};

export default ControlPanel;
