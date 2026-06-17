import type { GridPos } from './PathPlanner';

export interface ObstacleData {
  x: number;
  z: number;
  radius: number;
}

/**
 * SlamEngine simulates ray-cast Simultaneous Localization and Mapping (SLAM).
 * It updates a 2D occupancy grid by projecting laser rays radially from the rover
 * and checking for collisions against static disaster zone rubble.
 */
export class SlamEngine {
  private static readonly MAP_RANGE = 15.0; // World size mapped: -15m to +15m
  private static readonly LIDAR_MAX_RANGE = 6.0; // Max laser reach in meters

  /**
   * Convert real-world coordinates [x, z] in meters to grid indices [col, row].
   */
  public static worldToGrid(
    x: number,
    z: number,
    width: number,
    height: number,
    resolution: number
  ): GridPos {
    // Map center (0,0) to grid center (width/2, height/2)
    const col = Math.floor((x + this.MAP_RANGE) / resolution);
    const row = Math.floor((z + this.MAP_RANGE) / resolution);
    return {
      x: Math.max(0, Math.min(width - 1, col)),
      y: Math.max(0, Math.min(height - 1, row))
    };
  }

  /**
   * Convert grid indices [col, row] to real-world coordinates [x, z] in meters.
   */
  public static gridToWorld(
    col: number,
    row: number,
    resolution: number
  ): { x: number; z: number } {
    const x = col * resolution - this.MAP_RANGE + resolution / 2;
    const z = row * resolution - this.MAP_RANGE + resolution / 2;
    return { x, z };
  }

  /**
   * Runs Lidar ray-casting sweep and updates the SLAM grid.
   * 
   * @param grid Flat array representing occupancy grid values (-1: unknown, 0: free, 100: occupied)
   * @param width Grid width in cells
   * @param height Grid height in cells
   * @param resolution Grid resolution in meters/cell
   * @param roverX Rover center X position (m)
   * @param roverZ Rover center Z position (m)
   * @param obstacles List of static obstacles in scene
   */
  public static updateSLAM(
    grid: number[],
    width: number,
    height: number,
    resolution: number,
    roverX: number,
    roverZ: number,
    obstacles: ObstacleData[]
  ): number[] {
    const updatedGrid = [...grid];

    // Determine Lidar rays to cast (36 rays: 10 degree divisions for 360 degree coverage)
    const rayCount = 36;
    const stepSize = 0.08; // Check collisions every 8cm along ray path
    const maxSteps = Math.floor(this.LIDAR_MAX_RANGE / stepSize);

    // Clear the cells directly beneath the rover chassis immediately as free space
    const roverGrid = this.worldToGrid(roverX, roverZ, width, height, resolution);
    this.clearSurroundingCells(updatedGrid, roverGrid.x, roverGrid.y, width, height);

    for (let r = 0; r < rayCount; r++) {
      const angle = (r * 2 * Math.PI) / rayCount;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      let hitObstacle = false;

      for (let s = 1; s <= maxSteps; s++) {
        const dist = s * stepSize;
        const rx = roverX + dist * cosA;
        const rz = roverZ + dist * sinA;

        // Convert ray tip coordinates to grid cell coordinate
        const cell = this.worldToGrid(rx, rz, width, height, resolution);
        const idx = cell.y * width + cell.x;

        // Boundary safety check
        if (rx < -this.MAP_RANGE || rx > this.MAP_RANGE || rz < -this.MAP_RANGE || rz > this.MAP_RANGE) {
          break;
        }

        // Check laser intersection against structural obstacles
        for (const obs of obstacles) {
          const dx = rx - obs.x;
          const dz = rz - obs.z;
          const sqDist = dx * dx + dz * dz;

          // If the laser beam hits the obstacle bounding circle
          if (sqDist < obs.radius * obs.radius) {
            updatedGrid[idx] = 100; // Flag occupied (Rubble)
            hitObstacle = true;
            break;
          }
        }

        if (hitObstacle) {
          break; // Stop tracing this laser ray (shadowing effect)
        } else {
          // Ray passed freely: flag cell as cleared free space (0)
          // Do not overwrite existing obstacle flags to handle minor laser noise
          if (updatedGrid[idx] !== 100) {
            updatedGrid[idx] = 0;
          }
        }
      }
    }

    return updatedGrid;
  }

  /**
   * Clears a small 3x3 footprint under the rover to free space.
   */
  private static clearSurroundingCells(grid: number[], cx: number, cy: number, w: number, h: number) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          grid[ny * w + nx] = 0;
        }
      }
    }
  }
}
export default SlamEngine;
