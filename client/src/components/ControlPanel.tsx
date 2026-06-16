import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import JointSlider from './JointSlider';
import { RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, Sliders, Target, Eye, EyeOff, Play, Zap } from 'lucide-react';

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
    sendDriveCommand, 
    resetSimulation 
  } = useSimulation();

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

      {/* SECTION: Mobile Rover Driving */}
      <div className="mt-auto pt-4 border-t border-dark-border/60">
        <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest mb-4 border-b border-dark-border pb-1">
          Mobile Base Drive
        </h3>

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
    </div>
  );
};

export default ControlPanel;
