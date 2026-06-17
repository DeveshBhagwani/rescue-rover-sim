import { Vector3D } from './Vector3D';
import type { ObstacleData } from './SlamEngine';

/**
 * CollisionDetector checks coordinates and poses of the mobile chassis and arm links
 * to identify imminent collisions against structural environment obstacles.
 */
export class CollisionDetector {
  /**
   * Checks if the mobile rover base chassis is in collision with any obstacle.
   * 
   * @param rx Rover real-world X coordinate
   * @param rz Rover real-world Z coordinate
   * @param obstacles List of static obstacles in the environment
   * @param chassisRadius Collision radius of the rover base (default 0.35m)
   * @param safetyMargin Safe distance buffer to trigger alerts (default 0.25m)
   * @returns Obstacle index if in collision/alert boundary, or null if safe
   */
  public static checkBaseCollision(
    rx: number,
    rz: number,
    obstacles: ObstacleData[],
    chassisRadius = 0.35,
    safetyMargin = 0.25
  ): { index: number; distance: number; limit: number } | null {
    const threshold = chassisRadius + safetyMargin;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      const dx = rx - obs.x;
      const dz = rz - obs.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Check distance against combined obstacle radius and chassis profile
      const collisionBoundary = obs.radius + threshold;
      if (dist < collisionBoundary) {
        return { index: i, distance: dist, limit: collisionBoundary };
      }
    }

    return null;
  }

  /**
   * Checks if the manipulator end-effector tip coordinate is in collision.
   * 
   * @param tipPos 3D coordinate of the gripper tip in world space
   * @param obstacles List of static obstacles
   * @param safetyMargin Safety envelope radius around the gripper (default 0.05m)
   * @returns true if collision is imminent, false if clear
   */
  public static checkArmCollision(
    tipPos: Vector3D,
    obstacles: ObstacleData[],
    safetyMargin = 0.05
  ): boolean {
    for (const obs of obstacles) {
      // Cylindrical bounding volume collision: check horizontal distance
      const dx = tipPos.x - obs.x;
      const dz = tipPos.z - obs.z;
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);

      // Check if within obstacle radius plus gripper buffer
      if (horizontalDist < obs.radius + safetyMargin) {
        // Concrete block heights are simulated at ~1.0m from ground
        // Tip Y is relative to rover elevation (~0.12m)
        // If arm tip is low enough to strike the obstacle block physically:
        if (tipPos.y < 1.0) {
          return true;
        }
      }
    }
    return false;
  }
}
export default CollisionDetector;
