import React, { useMemo } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend
} from 'recharts';

export const TelemetryCharts: React.FC = () => {
  const {
    isReplayMode,
    replayFrames,
    replayIndex
  } = useSimulation();

  // Process data from raw historical frames list
  const chartData = useMemo(() => {
    if (!isReplayMode || replayFrames.length === 0) return [];
    
    return replayFrames.map((f, idx) => {
      const timeLabel = new Date(f.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      return {
        index: idx,
        time: timeLabel,
        j2Torque: Number((f.jointTorques?.[1] || 0.0).toFixed(2)),
        j3Force: Number((f.jointTorques?.[2] || 0.0).toFixed(2)),
        j5Torque: Number((f.jointTorques?.[4] || 0.0).toFixed(2)),
        steerError: Number((f.pidErrors?.steer || 0.0).toFixed(3)),
        distError: Number((f.pidErrors?.distance || 0.0).toFixed(3)),
        manipulability: Number((f.manipulability || 0.0).toFixed(5))
      };
    });
  }, [replayFrames, isReplayMode]);

  if (!isReplayMode || replayFrames.length === 0) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center border border-dashed border-dark-border/60 rounded-xl bg-dark-card/40 p-6 text-center text-xs font-mono text-slate-500 leading-relaxed">
        <div>
          <p className="font-bold text-slate-400 mb-1">REPLAY ANALYTICS CHARTING</p>
          <p>Load a recorded mission session from the timeline controls above to inspect high-frequency dynamics plots.</p>
        </div>
      </div>
    );
  }

  // Custom tooltips styling
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/90 border border-dark-border rounded p-2 text-[10px] font-mono text-slate-300 leading-normal">
          <div className="text-cyan-400 font-bold border-b border-dark-border/40 pb-1 mb-1">
            Frame: {payload[0].payload.index + 1} ({payload[0].payload.time})
          </div>
          {payload.map((item: any) => (
            <div key={item.name} className="flex justify-between gap-4">
              <span>{item.name}:</span>
              <span style={{ color: item.color }} className="font-bold">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
      {/* 1. Joint Loads/Torques Chart */}
      <div className="bg-dark-card/90 border border-dark-border/80 rounded-xl p-4 glassmorphism flex flex-col h-[320px]">
        <h4 className="text-[11px] font-bold font-mono text-cyan-400 tracking-wider mb-3 uppercase">
          Dynamic Joint Torques & Forces
        </h4>
        <div className="flex-grow">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
              <XAxis dataKey="index" stroke="#475569" fontSize={9} tickLine={false} />
              <YAxis stroke="#475569" fontSize={9} tickLine={false} />
              <Tooltip content={customTooltip} />
              <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
              
              <Line type="monotone" dataKey="j2Torque" name="J2 Torque (N·m)" stroke="#06B6D4" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="j3Force" name="J3 Force (N)" stroke="#A855F7" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="j5Torque" name="J5 Torque (N·m)" stroke="#3B82F6" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
              
              <ReferenceLine x={replayIndex} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. PID Alignment Errors Chart */}
      <div className="bg-dark-card/90 border border-dark-border/80 rounded-xl p-4 glassmorphism flex flex-col h-[320px]">
        <h4 className="text-[11px] font-bold font-mono text-purple-400 tracking-wider mb-3 uppercase">
          Closed-Loop Tracking Errors
        </h4>
        <div className="flex-grow">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.5} />
              <XAxis dataKey="index" stroke="#475569" fontSize={9} tickLine={false} />
              <YAxis stroke="#475569" fontSize={9} tickLine={false} />
              <Tooltip content={customTooltip} />
              <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: 9, fontFamily: 'monospace' }} />
              
              <Line type="monotone" dataKey="steerError" name="Steer Error (rad)" stroke="#F43F5E" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="distError" name="Dist Error (m)" stroke="#F59E0B" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
              
              <ReferenceLine x={replayIndex} stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="3 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TelemetryCharts;
