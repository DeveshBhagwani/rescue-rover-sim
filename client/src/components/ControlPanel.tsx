import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import JointSlider from './JointSlider';
import { RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square } from 'lucide-react';

export const ControlPanel: React.FC = () => {
  const { 
    jointValues, 
    setJointValue, 
    sendDriveCommand, 
    resetSimulation 
  } = useSimulation();

  // Joint specifications
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold font-mono tracking-wider text-cyan-400">COMMAND PORTAL</h2>
        <button
          onClick={resetSimulation}
          className="p-1.5 rounded-lg bg-dark-card hover:bg-slate-700 border border-dark-border transition duration-200"
          title="Reset Joint to Home Position"
        >
          <RotateCcw className="w-4 h-4 text-slate-300" />
        </button>
      </div>

      {/* SECTION: Robotic Arm Control */}
      <div className="mb-6">
        <h3 className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest mb-4 border-b border-dark-border pb-1">
          Manipulator Controls
        </h3>
        
        {jointSpecs.map((spec, i) => (
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
        ))}
      </div>

      {/* SECTION: Mobile Rover Driving */}
      <div className="mt-auto">
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
        
        <p className="text-[10px] text-slate-500 text-center font-mono">
          Click buttons to issue discrete velocity commands to differential drive controllers.
        </p>
      </div>
    </div>
  );
};

export default ControlPanel;
