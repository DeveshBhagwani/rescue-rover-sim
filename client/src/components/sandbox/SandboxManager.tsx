import React, { useState, useEffect } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { PathPlanner, type GridPos } from '../../math/PathPlanner';
import { SlamEngine } from '../../math/SlamEngine';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Play, RotateCcw, CheckCircle, BarChart3, Shuffle, Target } from 'lucide-react';

interface BenchmarkData {
  name: string;
  time: number;
  nodes: number;
  length: number;
  color: string;
}

export const SandboxManager: React.FC = () => {
  const {
    slamGrid,
    slamWidth,
    slamHeight,
    slamResolution,
    roverPosition,
    activeObstacles,
    setActiveObstacles,
    defaultObstacles,
    pathfinderAlgorithm,
    setPathfinderAlgorithm,
    setNavigationWaypoint,
    setIsAutonomousDriving,
    targetWaypoint
  } = useSimulation();

  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkData[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<GridPos | null>(null);

  // Run the benchmark comparison for all three algorithms on the current map
  const runBenchmark = () => {
    // 1. Determine start position in grid
    const startGrid = SlamEngine.worldToGrid(
      roverPosition[0],
      roverPosition[2],
      slamWidth,
      slamHeight,
      slamResolution
    );

    // 2. Determine goal position in grid (either targetWaypoint, selectedGoal, or default)
    let goalGrid: GridPos = { x: 45, y: 45 }; // default goal in upper-right
    if (targetWaypoint) {
      goalGrid = SlamEngine.worldToGrid(
        targetWaypoint.x,
        targetWaypoint.z,
        slamWidth,
        slamHeight,
        slamResolution
      );
    } else if (selectedGoal) {
      goalGrid = selectedGoal;
    }

    // 3. Execute all 3 pathfinders on the current slamGrid
    const astarResult = PathPlanner.planPath('astar', slamGrid, slamWidth, slamHeight, startGrid, goalGrid);
    const dijkstraResult = PathPlanner.planPath('dijkstra', slamGrid, slamWidth, slamHeight, startGrid, goalGrid);
    const dstarliteResult = PathPlanner.planPath('dstarlite', slamGrid, slamWidth, slamHeight, startGrid, goalGrid);

    // 4. Populate benchmark data
    const data: BenchmarkData[] = [
      {
        name: 'A*',
        time: parseFloat(astarResult.executionTimeMs.toFixed(3)),
        nodes: astarResult.nodesExpanded,
        length: astarResult.path ? parseFloat(astarResult.pathLength.toFixed(2)) : 0,
        color: '#06B6D4' // cyan
      },
      {
        name: 'Dijkstra',
        time: parseFloat(dijkstraResult.executionTimeMs.toFixed(3)),
        nodes: dijkstraResult.nodesExpanded,
        length: dijkstraResult.path ? parseFloat(dijkstraResult.pathLength.toFixed(2)) : 0,
        color: '#3B82F6' // blue
      },
      {
        name: 'D* Lite',
        time: parseFloat(dstarliteResult.executionTimeMs.toFixed(3)),
        nodes: dstarliteResult.nodesExpanded,
        length: dstarliteResult.path ? parseFloat(dstarliteResult.pathLength.toFixed(2)) : 0,
        color: '#A855F7' // purple
      }
    ];

    setBenchmarkResults(data);
  };

  // Run benchmark automatically when waypoint changes
  useEffect(() => {
    if (targetWaypoint) {
      runBenchmark();
    }
  }, [targetWaypoint]);

  // Procedurally generate a maze using Depth-First Search (DFS) with backtracking
  const generateProceduralMaze = () => {
    setIsAutonomousDriving(false);
    
    const size = 15; // 15x15 maze cells matching 60x60 grid (each block is 4x4 cells)
    const maze = Array(size).fill(null).map(() => Array(size).fill(true)); // true means wall
    const visited = Array(size).fill(null).map(() => Array(size).fill(false));

    // Stack for backtracking
    const stack: [number, number][] = [];
    
    // Start DFS at center cell (7,7) to ensure start point is free
    const startX = 7;
    const startY = 7;
    visited[startY][startX] = false;
    maze[startY][startX] = false; // carve start cell
    stack.push([startX, startY]);

    while (stack.length > 0) {
      const [cx, cy] = stack[stack.length - 1];
      const neighbors: [number, number, number, number][] = []; // [nx, ny, wall_x, wall_y]

      // Directions: Up, Down, Left, Right (jump 2 cells to maintain walls between corridors)
      const dirs = [
        [0, -2], // Up
        [0, 2],  // Down
        [-2, 0], // Left
        [2, 0]   // Right
      ];

      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < size && ny >= 0 && ny < size && !visited[ny][nx]) {
          neighbors.push([nx, ny, cx + dx / 2, cy + dy / 2]);
        }
      }

      if (neighbors.length > 0) {
        // Pick random unvisited neighbor
        const [nx, ny, wx, wy] = neighbors[Math.floor(Math.random() * neighbors.length)];
        
        visited[ny][nx] = true;
        maze[ny][nx] = false; // carve neighbor
        maze[wy][wx] = false; // carve wall between them
        
        stack.push([nx, ny]);
      } else {
        stack.pop(); // backtrack
      }
    }

    // Force clear starting area around center (7, 7) and a goal area
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = 7 + dx;
        const y = 7 + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) {
          maze[y][x] = false;
        }
      }
    }

    // Ensure a clear destination corridor in a random corner
    const corners = [[1, 1], [1, 13], [13, 1], [13, 13]];
    const [gx, gy] = corners[Math.floor(Math.random() * corners.length)];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = gx + dx;
        const y = gy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) {
          maze[y][x] = false;
        }
      }
    }

    // Convert carved maze layout to dynamic ObstacleData cylinders
    // Each maze wall block represents a 4x4 subgrid in the 60x60 grid map.
    const newObstacles: { x: number; z: number; radius: number }[] = [];
    const cellSizeWorld = 2.0; // 2m x 2m cell (4 cells of 0.5m)
    const offset = -15.0; // world coordinates offset for grid boundaries [-15m, 15m]

    for (let my = 0; my < size; my++) {
      for (let mx = 0; mx < size; mx++) {
        if (maze[my][mx]) {
          // Calculate world position center for the wall block
          const wx = mx * cellSizeWorld + offset + cellSizeWorld / 2;
          const wz = my * cellSizeWorld + offset + cellSizeWorld / 2;
          
          newObstacles.push({
            x: wx,
            z: wz,
            radius: 0.95 // blocks the 2m cell nicely with a small overlap
          });
        }
      }
    }

    setActiveObstacles(newObstacles);
    
    // Select a default goal position near corner in grid index coordinates
    const finalGoal: GridPos = { x: gx * 4 + 2, y: gy * 4 + 2 };
    setSelectedGoal(finalGoal);

    console.log(`[Procedural Sandbox] Carved new recursive DFS maze containing ${newObstacles.length} wall pillars.`);
  };

  // Re-load the default rubble environment
  const resetToDefaultObstacles = () => {
    setIsAutonomousDriving(false);
    setActiveObstacles(defaultObstacles);
    setSelectedGoal(null);
    setBenchmarkResults([]);
  };

  // Triggers random valid target coordinate selection
  const selectRandomGoal = () => {
    if (activeObstacles.length === 0) return;

    // Search for a clear grid cell that does not hit any obstacles
    let found = false;
    let attempts = 0;
    let targetCell: GridPos = { x: 45, y: 45 };

    while (!found && attempts < 100) {
      const rx = Math.floor(Math.random() * (slamWidth - 10)) + 5;
      const ry = Math.floor(Math.random() * (slamHeight - 10)) + 5;
      
      // Convert to world space
      const wx = rx * slamResolution - 15 + slamResolution / 2;
      const wz = ry * slamResolution - 15 + slamResolution / 2;

      // Start clearance (avoid setting target at starting base)
      const distFromStart = Math.sqrt(wx * wx + wz * wz);
      if (distFromStart < 3.0) {
        attempts++;
        continue;
      }

      // Check collision
      let collides = false;
      for (const obs of activeObstacles) {
        const dx = obs.x - wx;
        const dz = obs.z - wz;
        if (Math.sqrt(dx * dx + dz * dz) <= obs.radius + 0.8) {
          collides = true;
          break;
        }
      }

      if (!collides) {
        targetCell = { x: rx, y: ry };
        found = true;
      }
      attempts++;
    }

    setSelectedGoal(targetCell);
    const worldCoords = SlamEngine.gridToWorld(targetCell.x, targetCell.y, slamResolution);
    setNavigationWaypoint(worldCoords.x, worldCoords.z);
  };

  return (
    <div className="flex flex-col gap-4 font-mono text-xs text-slate-200">
      {/* Description Panel */}
      <div className="bg-purple-950/20 border border-purple-500/30 p-3 rounded-lg leading-relaxed text-[11px] text-purple-200">
        <h4 className="font-bold mb-1 flex items-center gap-1">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          ALGORITHMIC PATHFINDING SANDBOX
        </h4>
        Stress-test real-time navigation algorithms. Swapping algorithm here immediately impacts the self-drive routing.
      </div>

      {/* Controller Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={generateProceduralMaze}
          className="py-2 px-3 bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500 text-purple-300 hover:text-purple-200 font-bold rounded-lg transition duration-200 flex items-center justify-center gap-1.5"
        >
          <Shuffle className="w-4 h-4" />
          GENERATE MAZE
        </button>
        <button
          onClick={resetToDefaultObstacles}
          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-bold rounded-lg transition duration-200 flex items-center justify-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" />
          RESET MAP
        </button>
      </div>

      {/* Select active algorithm */}
      <div className="bg-dark-bg/60 p-3 rounded-lg border border-dark-border">
        <label className="text-[10px] text-slate-400 block mb-2 uppercase tracking-wider">Active Pathfinder Link</label>
        <div className="grid grid-cols-3 gap-1">
          {(['astar', 'dijkstra', 'dstarlite'] as const).map((algo) => {
            const isSelected = pathfinderAlgorithm === algo;
            const label = algo === 'astar' ? 'A*' : (algo === 'dijkstra' ? 'Dijkstra' : 'D* Lite');
            const borderCol = algo === 'astar' ? 'border-cyan-500/40 text-cyan-400 bg-cyan-950/20' : (algo === 'dijkstra' ? 'border-blue-500/40 text-blue-400 bg-blue-950/20' : 'border-purple-500/40 text-purple-400 bg-purple-950/20');
            return (
              <button
                key={algo}
                onClick={() => setPathfinderAlgorithm(algo)}
                className={`py-1.5 px-1 border rounded-md text-[10px] font-bold transition duration-200 ${
                  isSelected ? `${borderCol} ring-1 ring-offset-0 ring-current` : 'border-dark-border text-slate-400 hover:text-slate-200 bg-dark-card/50'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Goal waypoint selections */}
      <div className="flex gap-2">
        <button
          onClick={selectRandomGoal}
          className="flex-grow py-2 bg-cyan-600/20 hover:bg-cyan-600/35 border border-cyan-500 text-cyan-300 font-bold rounded-lg transition duration-200 flex items-center justify-center gap-1.5"
        >
          <Target className="w-4 h-4 text-cyan-400" />
          PICK RANDOM GOAL
        </button>
        <button
          onClick={runBenchmark}
          className="py-2 px-3 bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500 text-purple-300 font-bold rounded-lg transition duration-200 flex items-center justify-center gap-1.5"
          disabled={!selectedGoal && !targetWaypoint}
        >
          <Play className="w-4 h-4" />
          RUN BENCHMARK
        </button>
      </div>

      {/* Benchmark results table and charts */}
      {benchmarkResults.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-dark-border/40">
          <div className="bg-dark-bg/60 rounded-lg border border-dark-border overflow-hidden">
            <div className="px-3 py-1.5 bg-dark-card/75 border-b border-dark-border flex justify-between items-center text-[10px] text-slate-400">
              <span className="font-bold uppercase tracking-wider">Routing Scoreboard</span>
              <CheckCircle className="w-3.5 h-3.5 text-cyber-success" />
            </div>

            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="border-b border-dark-border/50 text-slate-500">
                  <th className="p-2">ALGORITHM</th>
                  <th className="p-2 text-right">TIME (ms)</th>
                  <th className="p-2 text-right">EXPANDED</th>
                  <th className="p-2 text-right">LENGTH</th>
                </tr>
              </thead>
              <tbody>
                {benchmarkResults.map((res) => (
                  <tr key={res.name} className="border-b border-dark-border/30 hover:bg-dark-card/20 text-slate-200">
                    <td className="p-2 font-bold flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: res.color }} />
                      {res.name}
                    </td>
                    <td className="p-2 text-right font-mono text-cyan-400">{res.time} ms</td>
                    <td className="p-2 text-right font-mono text-amber-400">{res.nodes}</td>
                    <td className="p-2 text-right font-mono text-purple-400">{res.length > 0 ? `${res.length}m` : 'BLOCKED'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recharts Bar graph comparison */}
          <div className="bg-dark-bg/40 p-3 rounded-lg border border-dark-border space-y-3">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Node Expansion Overhead (Computational cost)
            </div>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={benchmarkResults} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '9px' }}
                  />
                  <Bar dataKey="nodes" fill="#38bdf8" radius={[4, 4, 0, 0]}>
                    {benchmarkResults.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-2 border-t border-dark-border/40">
              Execution speed Comparison (milliseconds)
            </div>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={benchmarkResults} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px' }}
                    labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '9px' }}
                  />
                  <Bar dataKey="time" fill="#818cf8" radius={[4, 4, 0, 0]}>
                    {benchmarkResults.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SandboxManager;
