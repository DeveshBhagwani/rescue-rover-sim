import { Vector3D } from './Vector3D';
import { Matrix4x4 } from './Matrix4x4';

export interface JointPose {
  position: Vector3D;
  orientation: Matrix4x4;
}

/**
 * KinematicsSolver handles Forward Kinematics (FK), Inverse Kinematics (IK),
 * and workspace envelope sampling for the custom 6-DOF RescueRover manipulator.
 * 
 * Link Specifications:
 * - Base Height (L0) = 0.15 m (Waist height)
 * - Upper Arm (L1) = 0.25 m
 * - Elbow/Forearm base (L2) = 0.20 m
 * - Prismatic Joint limit = [0.0, 0.15] m
 * - Forearm extension segment (L3) = 0.15 m
 * - Gripper offset (Leff) = 0.06 m
 */
export class KinematicsSolver {
  public static readonly L0 = 0.15;   // Base height
  public static readonly L1 = 0.25;   // Upper column
  public static readonly L2 = 0.20;   // Forearm sleeve
  public static readonly L3 = 0.15;   // Extendable shaft
  public static readonly LEFF = 0.06; // Gripper extension

  // Limits
  public static readonly J3_MIN = 0.0;
  public static readonly J3_MAX = 0.15;
  public static readonly J2_MIN = -Math.PI / 2;
  public static readonly J2_MAX = Math.PI / 2;

  /**
   * Forward Kinematics (FK)
   * 
   * Computes the 3D poses (positions and orientations) of each joint in the chain.
   * Transforms are computed by chain-multiplying homogeneous transformation matrices:
   * T_world_to_joint = T_0 * T_1 * ... * T_i
   * 
   * @param jointValues Array of 6 joint values: [q1 (rad), q2 (rad), q3 (m), q4 (rad), q5 (rad), q6 (rad)]
   * @returns Array of intermediate joint poses
   */
  public static solveFK(jointValues: number[]): JointPose[] {
    const q1 = jointValues[0] || 0;
    const q2 = jointValues[1] || 0;
    const q3 = jointValues[2] || 0; // Prismatic extension
    const q4 = jointValues[3] || 0;
    const q5 = jointValues[4] || 0;
    const q6 = jointValues[5] || 0;

    const poses: JointPose[] = [];

    // 1. Arm Base Frame (Origin)
    let currentT = Matrix4x4.identity();
    poses.push({
      position: currentT.getTranslation(),
      orientation: currentT.clone()
    });

    // 2. Base Column (translates up to Waist Joint J1 along Y)
    currentT = currentT.multiply(Matrix4x4.translation(0, this.L0, 0));
    // J1: Revolute joint rotating about Y
    currentT = currentT.multiply(Matrix4x4.rotationY(q1));
    poses.push({
      position: currentT.getTranslation(),
      orientation: currentT.clone()
    });

    // 3. Link 1 (translates up to Shoulder Joint J2 along Y)
    currentT = currentT.multiply(Matrix4x4.translation(0, this.L1, 0));
    // J2: Revolute joint rotating about X
    currentT = currentT.multiply(Matrix4x4.rotationX(q2));
    poses.push({
      position: currentT.getTranslation(),
      orientation: currentT.clone()
    });

    // 4. Link 2 + J3 (Prismatic joint along Y) + Link 3
    // Combined length of forearm = L2 + extension (q3) + L3
    const forearmLength = this.L2 + q3 + this.L3;
    currentT = currentT.multiply(Matrix4x4.translation(0, forearmLength, 0));
    // This brings us to the Wrist Joint J4/5/6
    poses.push({
      position: currentT.getTranslation(),
      orientation: currentT.clone()
    });

    // 5. Wrist Rotations (J4 Yaw about Y, J5 Pitch about X, J6 Roll about Z)
    const R_wrist = Matrix4x4.rotationY(q4)
      .multiply(Matrix4x4.rotationX(q5))
      .multiply(Matrix4x4.rotationZ(q6));
    currentT = currentT.multiply(R_wrist);
    poses.push({
      position: currentT.getTranslation(),
      orientation: currentT.clone()
    });

    // 6. End-effector Gripper Tip (translated by LEFF along local Y)
    currentT = currentT.multiply(Matrix4x4.translation(0, this.LEFF, 0));
    poses.push({
      position: currentT.getTranslation(),
      orientation: currentT.clone()
    });

    return poses;
  }

  /**
   * Inverse Kinematics (IK)
   * 
   * Analytical solver utilizing Kinematic Decoupling. 
   * 1. The target end-effector tip position and rotation matrix are known.
   * 2. The wrist center is calculated by projecting backwards along the hand direction.
   * 3. Joint 1, 2, and 3 are calculated from the wrist position.
   * 4. Joint 4, 5, and 6 (spherical wrist) are solved from the remaining orientation matrix.
   * 
   * @param targetPosition Target 3D coordinates in arm base frame
   * @param targetRotation Target orientation matrix (4x4)
   * @returns Array of 6 joint values, or null if target is mathematically impossible
   */
  public static solveIK(targetPosition: Vector3D, targetRotation: Matrix4x4): number[] | null {
    // 1. Get Wrist center by subtracting gripper extension along the hand local Y-axis
    // The local Y-axis vector is the second column of the rotation matrix (elements 1, 5, 9)
    const re = targetRotation.elements;
    const handDirection = new Vector3D(re[1], re[5], re[9]).normalize();
    const wristPosition = targetPosition.subtract(handDirection.scale(this.LEFF));

    // 2. Solve Joint 1 (Waist Yaw in X-Z plane)
    // q1 = atan2(x, z)
    // We treat z as forward and x as right
    const q1 = Math.atan2(wristPosition.x, wristPosition.z);

    // 3. Solve Joint 2 and Joint 3 (Shoulder Pitch and Prismatic Extension)
    // Project wrist position into the rotated vertical plane of the arm
    const xRadial = Math.sqrt(wristPosition.x * wristPosition.x + wristPosition.z * wristPosition.z);
    const yLocal = wristPosition.y - this.L0; // Adjust for base column height L0

    // Radial coordinate relative to the shoulder joint (located at [0, L1] in local vertical frame)
    const dx = xRadial;
    const dy = yLocal - this.L1;

    // Total distance from shoulder joint to wrist center
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Solve q2: angle of the forearm relative to straight up
    // q2 = atan2(dx, dy)
    let q2 = Math.atan2(dx, dy);
    
    // Clamp Joint 2 to physical ranges [-pi/2, pi/2]
    q2 = Math.max(this.J2_MIN, Math.min(this.J2_MAX, q2));

    // Solve q3: extension length
    // Total forearm length = L2 + q3 + L3. Thus q3 = total_length - L2 - L3
    let q3 = dist - (this.L2 + this.L3);
    
    // Clamp Joint 3 to physical slide boundaries [0, 0.15]
    q3 = Math.max(this.J3_MIN, Math.min(this.J3_MAX, q3));

    // 4. Solve Joint 4, 5, 6 (Spherical Wrist Euler angle extraction)
    // Base-to-wrist rotation matrix without the wrist: R0_3 = Ry(q1) * Rx(q2)
    const R0_3 = Matrix4x4.rotationY(q1).multiply(Matrix4x4.rotationX(q2));
    
    // Remaining rotation for the wrist: R_wrist = (R0_3)^T * R_target
    // Since R0_3 is orthonormal, transpose is equivalent to inverse:
    const r03e = R0_3.elements;
    const R0_3_T = new Matrix4x4([
      r03e[0], r03e[4], r03e[8],  0,
      r03e[1], r03e[5], r03e[9],  0,
      r03e[2], r03e[6], r03e[10], 0,
      0,       0,       0,        1
    ]);

    const M = R0_3_T.multiply(targetRotation);
    const me = M.elements;

    // Extract Euler angles for Y-X-Z sequence: R_wrist = Ry(q4) * Rx(q5) * Rz(q6)
    // Equating to M elements:
    // me[7] = -sin(q5) -> q5 = asin(-me[7])
    // If cos(q5) !== 0, we can extract q4 and q6:
    // me[2] = sin(q4)cos(q5), me[10] = cos(q4)cos(q5) -> q4 = atan2(me[2], me[10])
    // me[4] = cos(q5)sin(q6), me[5] = cos(q5)cos(q6) -> q6 = atan2(me[4], me[5])

    let q4 = 0;
    let q5 = 0;
    let q6 = 0;

    const sinQ5 = -me[7];
    const cosQ5Sq = 1 - sinQ5 * sinQ5;

    if (cosQ5Sq > 1e-6) {
      q5 = Math.asin(sinQ5);
      q4 = Math.atan2(me[2], me[10]);
      q6 = Math.atan2(me[4], me[5]);
    } else {
      // Singularity/Gimbal Lock (q5 is +/- 90 degrees)
      // Set q6 (Roll) to 0 and solve q4 (Yaw) from remaining matrices
      q5 = sinQ5 > 0 ? Math.PI / 2 : -Math.PI / 2;
      q6 = 0;
      // In this state, me[0] contains cos(q4 - q6) or similar
      q4 = Math.atan2(-me[8], me[0]);
    }

    return [q1, q2, q3, q4, q5, q6];
  }

  /**
   * Generates a point cloud sampling of the robot arm's reachable workspace bounds.
   * Samples joint variables q1, q2, and q3 at uniform intervals, and runs FK to gather positions.
   * 
   * @param density Number of step divisions for each joint
   * @returns Array of Vector3D positions representing boundary points
   */
  public static generateWorkspacePoints(density = 8): Vector3D[] {
    const points: Vector3D[] = [];
    
    const q1Steps = density * 2; // Yaw ranges full 360 (-pi to pi)
    const q2Steps = density;     // Pitch ranges 180 (-pi/2 to pi/2)
    const q3Steps = 4;           // Extension length samples

    for (let i = 0; i <= q1Steps; i++) {
      const q1 = -Math.PI + (i / q1Steps) * (2 * Math.PI);
      for (let j = 0; j <= q2Steps; j++) {
        const q2 = this.J2_MIN + (j / q2Steps) * (this.J2_MAX - this.J2_MIN);
        for (let k = 0; k <= q3Steps; k++) {
          const q3 = this.J3_MIN + (k / q3Steps) * (this.J3_MAX - this.J3_MIN);
          
          // Compute FK positions
          const poses = this.solveFK([q1, q2, q3, 0, 0, 0]);
          const endEffectorPos = poses[poses.length - 1].position;
          
          points.push(endEffectorPos);
        }
      }
    }

    return points;
  }
}
export default KinematicsSolver;
