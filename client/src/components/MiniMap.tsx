import React, { useRef, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { SlamEngine } from '../math/SlamEngine';

/**
 * MiniMap displays the 2D tactical occupancy grid generated during SLAM sweeps.
 * - Explored obstacles: Glowing Cyan
 * - Free Space: Slate Gray
 * - Unknown space: Translucent dark blue
 */
export const MiniMap: React.FC = () => {
  const {
    slamGrid,
    slamWidth,
    slamHeight,
    slamResolution,
    roverPosition,
    roverHeading,
    navigationPath,
    targetWaypoint
  } = useSimulation();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellWidth = canvas.width / slamWidth;
    const cellHeight = canvas.height / slamHeight;

    // 1. Draw Occupancy Grid pixels
    for (let y = 0; y < slamHeight; y++) {
      for (let x = 0; x < slamWidth; x++) {
        const val = slamGrid[y * slamWidth + x];
        
        if (val === 100) {
          ctx.fillStyle = '#06B6D4'; // Glowing Cyan (Obstacle/Rubble)
        } else if (val === 0) {
          ctx.fillStyle = '#1E293B'; // Dark slate-800 (Explored Free Space)
        } else {
          ctx.fillStyle = '#090D1A'; // Deep blue (Unexplored Sector)
        }
        
        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
      }
    }

    // 2. Draw planned A* path nodes
    if (navigationPath && navigationPath.length > 0) {
      ctx.beginPath();
      ctx.strokeStyle = '#A855F7'; // Purple neon
      ctx.lineWidth = 2.0;

      for (let i = 0; i < navigationPath.length; i++) {
        const p = navigationPath[i];
        const cx = p.x * cellWidth + cellWidth / 2;
        const cy = p.y * cellHeight + cellHeight / 2;
        
        if (i === 0) {
          ctx.moveTo(cx, cy);
        } else {
          ctx.lineTo(cx, cy);
        }
      }
      ctx.stroke();
    }

    // 3. Draw Target Waypoint crosshair
    if (targetWaypoint) {
      const targetGrid = SlamEngine.worldToGrid(
        targetWaypoint.x,
        targetWaypoint.z,
        slamWidth,
        slamHeight,
        slamResolution
      );
      ctx.strokeStyle = '#EF4444'; // Red target cross
      ctx.lineWidth = 1.5;
      
      const tx = targetGrid.x * cellWidth + cellWidth / 2;
      const ty = targetGrid.y * cellHeight + cellHeight / 2;
      
      ctx.beginPath();
      ctx.moveTo(tx - 6, ty);
      ctx.lineTo(tx + 6, ty);
      ctx.moveTo(tx, ty - 6);
      ctx.lineTo(tx, ty + 6);
      ctx.stroke();
    }

    // 4. Draw Rover Position and heading orientation
    const roverGrid = SlamEngine.worldToGrid(
      roverPosition[0],
      roverPosition[2],
      slamWidth,
      slamHeight,
      slamResolution
    );
    const rx = roverGrid.x * cellWidth + cellWidth / 2;
    const ry = roverGrid.y * cellHeight + cellHeight / 2;

    ctx.beginPath();
    ctx.arc(rx, ry, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#10B981'; // Green dot (Rover chassis)
    ctx.fill();
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Orientation vector line
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    // Heading theta points: heading = 0 is along positive Z (y in grid layout)
    ctx.lineTo(
      rx + 10 * Math.sin(roverHeading),
      ry + 10 * Math.cos(roverHeading)
    );
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [slamGrid, slamWidth, slamHeight, roverPosition, roverHeading, navigationPath, targetWaypoint, slamResolution]);

  return (
    <div className="absolute bottom-4 left-4 z-10 glassmorphism rounded-xl border border-dark-border p-3 font-mono text-dark-text select-none shadow-2xl flex flex-col items-center">
      <div className="text-[10px] text-slate-400 mb-2 tracking-wider">
        SLAM OCCUPANCY GRID (2D)
      </div>
      <canvas
        ref={canvasRef}
        width={180}
        height={180}
        className="border border-dark-border/60 rounded bg-[#090D1A] overflow-hidden"
      />
      <div className="flex justify-between w-full text-[8px] text-slate-500 mt-2">
        <span>GRID: 60x60</span>
        <span>RES: 0.5m</span>
      </div>
    </div>
  );
};

export default MiniMap;
