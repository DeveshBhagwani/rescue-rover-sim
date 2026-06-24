/**
 * PathPlanner implements the A* (A-Star), Dijkstra, and D* Lite path planning algorithms.
 * 
 * Algorithms:
 * 1. A*: Finds the shortest path by minimizing f(n) = g(n) + h(n).
 *    - g(n): Actual accumulated path cost from start to node n.
 *    - h(n): Heuristic estimate of remaining cost from n to goal (Euclidean distance).
 *    - f(n): Total estimated cost of path through node n.
 * 
 * 2. Dijkstra: A special case of A* where h(n) = 0. It is a uniform-cost search
 *    that guarantees the shortest path but expands more nodes than A*.
 * 
 * 3. D* Lite (Koenig & Likhachev): An incremental heuristic search algorithm.
 *    It plans a path backwards from goal to start, maintaining two estimates:
 *    - g(u): current cost-to-goal estimate.
 *    - rhs(u): one-step lookahead cost-to-goal estimate based on neighbor values.
 *    A node is consistent if g(u) == rhs(u), otherwise it is inconsistent.
 *    Inconsistent nodes are processed on a priority queue ordered by a 2-part key:
 *    k(u) = [ min(g(u), rhs(u)) + h(start, u), min(g(u), rhs(u)) ]
 */

export interface GridPos {
  x: number; // grid x coordinate
  y: number; // grid y coordinate
}

export interface PathPlanResult {
  path: GridPos[] | null;
  executionTimeMs: number;
  nodesExpanded: number;
  pathLength: number;
}

class PathNode {
  public x: number;
  public y: number;
  public g = 0; // Cost from start
  public h = 0; // Heuristic cost to goal
  public f = 0; // Total cost (g + h)
  public parent: PathNode | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class PathPlanner {
  /**
   * Solves for the shortest collision-free path between start and goal on an occupancy grid.
   * Uses 8-way diagonal connectivity.
   * 
   * @param grid Flat array of occupancy data (0 for free, 100 for occupied)
   * @param width Grid width in cells
   * @param height Grid height in cells
   * @param start Grid start coordinate
   * @param goal Grid goal coordinate
   * @returns Array of GridPos waypoints, or null if path is blocked
   */
  public static solveAStar(
    grid: number[],
    width: number,
    height: number,
    start: GridPos,
    goal: GridPos
  ): GridPos[] | null {
    const result = this.planPath('astar', grid, width, height, start, goal);
    return result.path;
  }

  /**
   * Compiles path planning results and execution metrics for different algorithms.
   */
  public static planPath(
    algorithm: string,
    grid: number[],
    width: number,
    height: number,
    start: GridPos,
    goal: GridPos
  ): PathPlanResult {
    const startTime = performance.now();
    let path: GridPos[] | null = null;
    let nodesExpanded = 0;

    switch (algorithm.toLowerCase()) {
      case 'dijkstra':
        [path, nodesExpanded] = this.solveAStarInternal(grid, width, height, start, goal, true);
        break;
      case 'dstarlite':
        [path, nodesExpanded] = this.solveDLiteInternal(grid, width, height, start, goal);
        break;
      case 'astar':
      default:
        [path, nodesExpanded] = this.solveAStarInternal(grid, width, height, start, goal, false);
        break;
    }

    const endTime = performance.now();
    const executionTimeMs = endTime - startTime;

    // Calculate path length
    let pathLength = 0;
    if (path && path.length > 1) {
      for (let i = 0; i < path.length - 1; i++) {
        const dx = path[i+1].x - path[i].x;
        const dy = path[i+1].y - path[i].y;
        pathLength += Math.sqrt(dx * dx + dy * dy) * 0.5; // grid cell width is 0.5 meters
      }
    }

    return {
      path,
      executionTimeMs,
      nodesExpanded,
      pathLength
    };
  }

  /**
   * Internal A* / Dijkstra solver returning path and expanded node counts.
   */
  private static solveAStarInternal(
    grid: number[],
    width: number,
    height: number,
    start: GridPos,
    goal: GridPos,
    isDijkstra: boolean
  ): [GridPos[] | null, number] {
    if (
      start.x < 0 || start.x >= width || start.y < 0 || start.y >= height ||
      goal.x < 0 || goal.x >= width || goal.y < 0 || goal.y >= height
    ) {
      return [null, 0];
    }

    const openSet: PathNode[] = [];
    const closedSet = new Uint8Array(width * height);
    let nodesExpanded = 0;

    const startNode = new PathNode(start.x, start.y);
    const goalNode = new PathNode(goal.x, goal.y);

    startNode.h = isDijkstra ? 0 : this.heuristic(start, goal);
    startNode.f = startNode.h;

    openSet.push(startNode);

    while (openSet.length > 0) {
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openSet[currentIndex];

      if (current.x === goalNode.x && current.y === goalNode.y) {
        return [this.reconstructPath(current), nodesExpanded];
      }

      openSet.splice(currentIndex, 1);
      const idx = current.y * width + current.x;
      if (closedSet[idx] === 1) continue;
      closedSet[idx] = 1;
      nodesExpanded++;

      const neighbors = this.getNeighbors(current.x, current.y, width, height);
      for (const neighborPos of neighbors) {
        const nIdx = neighborPos.y * width + neighborPos.x;

        if (closedSet[nIdx] === 1) continue;
        if (grid[nIdx] >= 50) continue;

        const isDiagonal = neighborPos.x !== current.x && neighborPos.y !== current.y;
        const movementCost = isDiagonal ? 1.414 : 1.0;
        const tentativeG = current.g + movementCost;

        let neighborNode = openSet.find(node => node.x === neighborPos.x && node.y === neighborPos.y);

        if (!neighborNode) {
          neighborNode = new PathNode(neighborPos.x, neighborPos.y);
          neighborNode.g = tentativeG;
          neighborNode.h = isDijkstra ? 0 : this.heuristic(neighborPos, goal);
          neighborNode.f = neighborNode.g + neighborNode.h;
          neighborNode.parent = current;
          openSet.push(neighborNode);
        } else if (tentativeG < neighborNode.g) {
          neighborNode.g = tentativeG;
          neighborNode.f = neighborNode.g + neighborNode.h;
          neighborNode.parent = current;
        }
      }
    }

    return [null, nodesExpanded];
  }

  /**
   * Internal D* Lite static pass solver returning path and expanded node counts.
   */
  private static solveDLiteInternal(
    grid: number[],
    width: number,
    height: number,
    start: GridPos,
    goal: GridPos
  ): [GridPos[] | null, number] {
    if (
      start.x < 0 || start.x >= width || start.y < 0 || start.y >= height ||
      goal.x < 0 || goal.x >= width || goal.y < 0 || goal.y >= height
    ) {
      return [null, 0];
    }

    const gridSize = width * height;
    const g = new Float32Array(gridSize).fill(Infinity);
    const rhs = new Float32Array(gridSize).fill(Infinity);

    // D* Lite runs search backwards from goal to start
    const goalIdx = goal.y * width + goal.x;
    const startIdx = start.y * width + start.x;
    rhs[goalIdx] = 0;

    // Open set U containing active inconsistent vertices (g !== rhs)
    const U: { key: [number, number]; idx: number }[] = [];
    let nodesExpanded = 0;

    const calculateKey = (idx: number): [number, number] => {
      const gVal = g[idx];
      const rhsVal = rhs[idx];
      const minVal = Math.min(gVal, rhsVal);
      // Heuristic from start to this cell
      const cellPos = { x: idx % width, y: Math.floor(idx / width) };
      const h = this.heuristic(start, cellPos);
      return [minVal + h, minVal];
    };

    const compareKeys = (k1: [number, number], k2: [number, number]): number => {
      if (k1[0] < k2[0]) return -1;
      if (k1[0] > k2[0]) return 1;
      if (k1[1] < k2[1]) return -1;
      if (k1[1] > k2[1]) return 1;
      return 0;
    };

    const updateVertex = (idx: number) => {
      if (idx !== goalIdx) {
        const x = idx % width;
        const y = Math.floor(idx / width);
        const neighbors = this.getNeighbors(x, y, width, height);
        let minRhs = Infinity;

        for (const n of neighbors) {
          const nIdx = n.y * width + n.x;
          if (grid[nIdx] >= 50) continue;
          const isDiagonal = n.x !== x && n.y !== y;
          const cost = isDiagonal ? 1.414 : 1.0;
          const val = cost + g[nIdx];
          if (val < minRhs) {
            minRhs = val;
          }
        }
        rhs[idx] = minRhs;
      }

      // Remove from U if exists
      const qIdx = U.findIndex(item => item.idx === idx);
      if (qIdx >= 0) {
        U.splice(qIdx, 1);
      }

      // Re-insert if inconsistent
      if (g[idx] !== rhs[idx]) {
        const key = calculateKey(idx);
        U.push({ key, idx });
        U.sort((a, b) => compareKeys(a.key, b.key));
      }
    };

    // Push goal vertex
    U.push({ key: calculateKey(goalIdx), idx: goalIdx });

    const maxExpansions = gridSize * 2;
    while (U.length > 0) {
      U.sort((a, b) => compareKeys(a.key, b.key));
      const startKey = calculateKey(startIdx);
      const top = U[0];

      if (compareKeys(top.key, startKey) >= 0 && rhs[startIdx] === g[startIdx]) {
        break;
      }

      if (nodesExpanded > maxExpansions) {
        break; // Infinite loop safety guard
      }

      const u = top.idx;
      const kOld = top.key;
      U.shift();
      nodesExpanded++;

      const kNew = calculateKey(u);
      if (compareKeys(kOld, kNew) < 0) {
        U.push({ key: kNew, idx: u });
      } else if (g[u] > rhs[u]) {
        g[u] = rhs[u];
        const ux = u % width;
        const uy = Math.floor(u / width);
        for (const n of this.getNeighbors(ux, uy, width, height)) {
          updateVertex(n.y * width + n.x);
        }
      } else {
        g[u] = Infinity;
        updateVertex(u);
        const ux = u % width;
        const uy = Math.floor(u / width);
        for (const n of this.getNeighbors(ux, uy, width, height)) {
          updateVertex(n.y * width + n.x);
        }
      }
    }

    // If path planning failed (goal is unreachable from start)
    if (g[startIdx] === Infinity) {
      return [null, nodesExpanded];
    }

    // Reconstruct greedy descent path from start to goal using g values
    const path: GridPos[] = [start];
    let currIdx = startIdx;
    const visited = new Set<number>([startIdx]);

    while (currIdx !== goalIdx) {
      const cx = currIdx % width;
      const cy = Math.floor(currIdx / width);
      const neighbors = this.getNeighbors(cx, cy, width, height);

      let bestIdx = -1;
      let minVal = Infinity;

      for (const n of neighbors) {
        const nIdx = n.y * width + n.x;
        if (visited.has(nIdx) || grid[nIdx] >= 50) continue;

        const isDiagonal = n.x !== cx && n.y !== cy;
        const cost = isDiagonal ? 1.414 : 1.0;
        const val = cost + g[nIdx];
        if (val < minVal) {
          minVal = val;
          bestIdx = nIdx;
        }
      }

      if (bestIdx === -1) {
        return [null, nodesExpanded]; // Path got broken during greedy extraction
      }

      currIdx = bestIdx;
      path.push({ x: currIdx % width, y: Math.floor(currIdx / width) });
      visited.add(currIdx);

      if (path.length > gridSize) {
        break; // safeguard
      }
    }

    return [path, nodesExpanded];
  }

  /**
   * Euclidean Heuristic distance metric.
   */
  private static heuristic(a: GridPos, b: GridPos): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get 8-way adjacent coordinates.
   */
  private static getNeighbors(x: number, y: number, width: number, height: number): GridPos[] {
    const list: GridPos[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          list.push({ x: nx, y: ny });
        }
      }
    }
    return list;
  }

  /**
   * Traverse parent links to compile path coordinate list.
   */
  private static reconstructPath(node: PathNode): GridPos[] {
    const path: GridPos[] = [];
    let curr: PathNode | null = node;
    while (curr !== null) {
      path.push({ x: curr.x, y: curr.y });
      curr = curr.parent;
    }
    return path.reverse();
  }
}
export default PathPlanner;
