import React, { useState, useEffect, useRef } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { Play, Pause, SkipBack, SkipForward, Power, RefreshCw, Radio } from 'lucide-react';

export const MissionScrubber: React.FC = () => {
  const {
    isReplayMode,
    replayFrames,
    replayIndex,
    replayMissionId,
    setReplayMode,
    loadReplaySession,
    setReplayIndex,
    startNewMission,
    currentMissionId
  } = useSimulation();

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedMission, setSelectedMission] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const playTimerRef = useRef<any>(null);

  // Fetch available sessions from MongoDB time series API
  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/replay/sessions');
      if (!res.ok) throw new Error('API server unreachable');
      const data = await res.json();
      setSessions(data);
      if (data.length > 0 && !selectedMission) {
        setSelectedMission(data[0].missionId);
      }
    } catch (err) {
      console.warn('[Replay] Error fetching replay sessions: ', err);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [isReplayMode]);

  // Handle timeline auto-playback
  useEffect(() => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }

    if (isPlaying && isReplayMode && replayFrames.length > 0) {
      const intervalMs = Math.max(50, 200 / playbackSpeed); // Telemetry logged at 5Hz (200ms)
      
      playTimerRef.current = setInterval(() => {
        if (replayIndex < replayFrames.length - 1) {
          setReplayIndex(replayIndex + 1);
        } else {
          setIsPlaying(false);
        }
      }, intervalMs);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, isReplayMode, replayFrames, replayIndex, playbackSpeed, setReplayIndex]);

  const togglePlay = () => {
    if (replayFrames.length === 0) return;
    if (replayIndex >= replayFrames.length - 1) {
      setReplayIndex(0); // Loop back if end reached
    }
    setIsPlaying(!isPlaying);
  };

  const handleStep = (direction: 'back' | 'forward') => {
    setIsPlaying(false);
    if (direction === 'back') {
      setReplayIndex(Math.max(0, replayIndex - 1));
    } else {
      setReplayIndex(Math.min(replayFrames.length - 1, replayIndex + 1));
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsPlaying(false);
    setReplayIndex(parseInt(e.target.value) || 0);
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMission(e.target.value);
  };

  const handleLoadSession = async () => {
    setIsPlaying(false);
    if (!selectedMission) return;
    await loadReplaySession(selectedMission);
    setReplayMode(true);
  };

  const handleExitReplay = () => {
    setIsPlaying(false);
    setReplayMode(false);
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="w-full bg-dark-card/90 border border-dark-border/80 rounded-xl p-4 font-mono text-dark-text shadow-2xl glassmorphism">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-3 border-b border-dark-border/40 pb-3">
        <div className="flex items-center gap-2">
          <Radio className={`w-4 h-4 ${isReplayMode ? 'text-slate-400' : 'text-cyber-danger animate-pulse'}`} />
          <div className="text-xs uppercase font-bold text-slate-200">
            {isReplayMode ? 'MISSION REPLAY MODE' : 'LIVE MISSION RECORDING'}
          </div>
        </div>

        {/* Live Recording HUD details */}
        {!isReplayMode && (
          <div className="flex items-center gap-3 bg-red-950/20 border border-red-500/20 px-3 py-1 rounded-md text-[10px]">
            <span className="text-red-400 font-bold animate-pulse">● LOGGING ON</span>
            <span className="text-slate-400 font-semibold truncate max-w-[120px]">
              ID: {currentMissionId.replace('mission_', '')}
            </span>
            <button
              onClick={startNewMission}
              className="p-1 rounded bg-slate-800 border border-dark-border text-slate-300 hover:text-white transition duration-200"
              title="Reset & Start New Log Mission"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Replay Session Selector */}
        <div className="flex items-center gap-2 flex-grow min-w-[200px]">
          <select
            value={selectedMission}
            onChange={handleSessionChange}
            className="flex-grow bg-dark-bg border border-dark-border text-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 font-mono transition duration-200"
          >
            {sessions.length === 0 ? (
              <option value="">No recorded sessions in DB</option>
            ) : (
              sessions.map((s) => (
                <option key={s.missionId} value={s.missionId}>
                  {formatDate(s.startTimestamp)} - {s.missionId.replace('mission_', '')} ({s.count} pts)
                </option>
              ))
            )}
          </select>

          {isReplayMode ? (
            <button
              onClick={handleExitReplay}
              className="px-3 py-1.5 rounded bg-red-900/20 hover:bg-red-900/40 border border-red-500/50 text-red-300 font-bold transition duration-200 text-xs flex items-center gap-1"
            >
              <Power className="w-3.5 h-3.5" />
              EXIT
            </button>
          ) : (
            <button
              onClick={handleLoadSession}
              disabled={sessions.length === 0}
              className="px-3 py-1.5 rounded bg-cyan-900/25 hover:bg-cyan-900/40 border border-cyan-500/40 text-cyan-300 hover:border-cyan-500 font-bold transition duration-200 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              LOAD
            </button>
          )}
        </div>

        {/* Playback Controls (only active in Replay Mode) */}
        {isReplayMode && (
          <div className="flex items-center gap-3">
            <div className="flex bg-dark-bg border border-dark-border rounded p-0.5">
              <button
                onClick={() => handleStep('back')}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={togglePlay}
                className="p-1.5 rounded hover:bg-slate-800 text-cyan-400 hover:text-cyan-300 transition"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => handleStep('forward')}
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Playback Speed selector */}
            <div className="flex bg-dark-bg border border-dark-border rounded text-[10px]">
              {[1, 2, 4].map((speed) => (
                <button
                  key={`speed-${speed}`}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-1 rounded transition ${
                    playbackSpeed === speed
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/35'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Scrubber Slider */}
      {isReplayMode && replayFrames.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[10px] text-slate-400">
            <span>
              REPLAY SESSION: <strong className="text-cyan-400 font-bold">{replayMissionId.replace('mission_', '')}</strong>
            </span>
            <span>
              FRAME: <strong className="text-cyan-400">{replayIndex + 1}</strong> / {replayFrames.length} (
              {formatDate(replayFrames[replayIndex]?.timestamp)})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={replayFrames.length - 1}
              value={replayIndex}
              onChange={handleSliderChange}
              className="flex-grow accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer appearance-none h-1.5"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionScrubber;
