/**
 * PathPlanner implements the A* (A-Star) path planning algorithm.
 * 
 * Algorithm:
 * A* finds the shortest path on a graph/grid by minimizing:
 * f(n) = g(n) + h(n)
 * - g(n): Actual accumulated path cost from start to node n.
 * - h(n): Heuristic estimate of remaining cost from n to goal (Euclidean distance).
 * - f(n): Total estimated cost of path through node n.
 */

export interface GridPos {
  x: number; // grid x coordinate
  y: number; // grid y coordinate
}

class AStarNode {
  public x: number;
  public y: number;
  public g = 0; // Cost from start
  public h = 0; // Heuristic cost to goal
  public f = 0; // Total cost (g + h)
  public parent: AStarNode | null = null;

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
    // Check bounds
    if (
      start.x < 0 || start.x >= width || start.y < 0 || start.y >= height ||
      goal.x < 0 || goal.x >= width || goal.y < 0 || goal.y >= height
    ) {
      return null;
    }

    // A* Open Set (candidate nodes to evaluate) and Closed Set (already evaluated nodes)
    const openSet: AStarNode[] = [];
    const closedSet = new Uint8Array(width * height); // 1 = evaluated

    const startNode = new AStarNode(start.x, start.y);
    const goalNode = new AStarNode(goal.x, goal.y);

    // Initial boundary heuristics
    startNode.h = this.heuristic(start, goal);
    startNode.f = startNode.h;

    openSet.push(startNode);

    while (openSet.length > 0) {
      // Find node in Open Set with lowest f value
      let currentIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openSet[currentIndex];

      // Goal check
      if (current.x === goalNode.x && current.y === goalNode.y) {
        return this.reconstructPath(current);
      }

      // Remove current node from Open Set and flag in Closed Set
      openSet.splice(currentIndex, 1);
      closedSet[current.y * width + current.x] = 1;

      // Expand to 8 neighbors
      const neighbors = this.getNeighbors(current, width, height);
      for (const neighborPos of neighbors) {
        const idx = neighborPos.y * width + neighborPos.x;

        // Skip if already evaluated
        if (closedSet[idx] === 1) continue;

        // Collision Check: Grid value >= 50 indicates an obstacle (rubble)
        if (grid[idx] >= 50) continue;

        // Movement cost: straight (1.0) vs diagonal (1.414)
        const isDiagonal = neighborPos.x !== current.x && neighborPos.y !== current.y;
        const movementCost = isDiagonal ? 1.414 : 1.0;
        const tentativeG = current.g + movementCost;

        // Check if neighbor already in Open Set
        let neighborNode = openSet.find(node => node.x === neighborPos.x && node.y === neighborPos.y);

        if (!neighborNode) {
          neighborNode = new AStarNode(neighborPos.x, neighborPos.y);
          neighborNode.g = tentativeG;
          neighborNode.h = this.heuristic(neighborPos, goal);
          neighborNode.f = neighborNode.g + neighborNode.h;
          neighborNode.parent = current;
          openSet.push(neighborNode);
        } else if (tentativeG < neighborNode.g) {
          // Found a better path to this node
          neighborNode.g = tentativeG;
          neighborNode.f = neighborNode.g + neighborNode.h;
          neighborNode.parent = current;
        }
      }
    }

    return null; // Open set empty, no path exists (target isolated by rubble)
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
  private static getNeighbors(node: AStarNode, width: number, height: number): GridPos[] {
    const list: GridPos[] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = node.x + dx;
        const ny = node.y + dy;
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
  private static reconstructPath(node: AStarNode): GridPos[] {
    const path: GridPos[] = [];
    let curr: AStarNode | null = node;
    while (curr !== null) {
      path.push({ x: curr.x, y: curr.y });
      curr = curr.parent;
    }
    return path.reverse(); // Flip to start -> goal order
  }
}
export default PathPlanner;
