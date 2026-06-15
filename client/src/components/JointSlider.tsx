import React from 'react';

interface JointSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  step?: number;
  onChange: (val: number) => void;
}

/**
 * JointSlider provides a control handle for a single joint.
 * Features micro-animations and boundary warnings.
 */
export const JointSlider: React.FC<JointSliderProps> = ({
  label,
  value,
  min,
  max,
  unit,
  step = 0.01,
  onChange
}) => {
  // Compute percentage for custom progress background bar
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-4 font-mono text-sm">
      <div className="flex justify-between text-dark-text mb-1">
        <span className="text-cyan-400 font-semibold">{label}</span>
        <span>
          {value.toFixed(2)}
          <span className="text-xs text-slate-400 ml-0.5">{unit}</span>
        </span>
      </div>

      <div className="relative flex items-center">
        {/* Slider input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-dark-border rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
          style={{
            background: `linear-gradient(to right, #06B6D4 0%, #06B6D4 ${percent}%, #334155 ${percent}%, #334155 100%)`
          }}
        />
      </div>

      {/* Axis range limits helper text */}
      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
        <span>MIN: {min.toFixed(1)}{unit}</span>
        <span>MAX: {max.toFixed(1)}{unit}</span>
      </div>
    </div>
  );
};

export default JointSlider;
