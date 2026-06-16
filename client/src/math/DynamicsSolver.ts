import { Vector3D } from './Vector3D';
import KinematicsSolver from './KinematicsSolver';

/**
 * DynamicsSolver manages differential kinematics (Jacobian), singularity measures,
 * static gravity torque loading, and null-space projection for boundary avoidance.
 */
export class DynamicsSolver {
  
  // Dynamic parameters (mass in kg, gravity in m/s^2)
  private static readonly G = 9.81;
  private static readonly M_FOREARM = 2.5; // Telescopic part mass
  private static readonly M_GRIPPER = 0.8; // Gripper mass

  /**
   * Computes the 6x6 Geometric Jacobian matrix for the 6-DOF manipulator.
   * Row 0..2: Linear velocity mapping (J_L)
   * Row 3..5: Angular velocity mapping (J_A)
   * Column 0..5: Joint variables Q1 to Q6
   * 
   * J_i = [ z_{i-1} x (p_e - p_{i-1}) ] (Revolute joint)
   *       [        z_{i-1}           ]
   * J_j = [ z_{j-1} ] (Prismatic joint)
   *       [   0   ]
   */
  public static computeJacobian(jointValues: number[]): number[][] {
    const poses = KinematicsSolver.solveFK(jointValues);
    const p_e = poses[poses.length - 1].position; // End effector tip position

    // Initialize 6x6 matrix with zeros
    const J: number[][] = Array(6).fill(0).map(() => Array(6).fill(0));

    // Get positions and orientation matrices of prior frames
    const p0 = poses[0].position; // Base origin
    const T0 = poses[0].orientation.elements;
    const z0 = new Vector3D(T0[1], T0[5], T0[9]); // Local Y axis of base is axis of J1

    const p1 = poses[1].position; // J2 position
    const T1 = poses[1].orientation.elements;
    const z1 = new Vector3D(T1[0], T1[4], T1[8]); // Local X axis of Link 1 is axis of J2

    const T2 = poses[2].orientation.elements;
    const z2 = new Vector3D(T2[1], T2[5], T2[9]); // Local Y axis of Link 2 is axis of J3 (linear)

    const p3 = poses[3].position; // J4/Wrist position
    const T3 = poses[3].orientation.elements;
    const z3 = new Vector3D(T3[1], T3[5], T3[9]); // Local Y axis of Link 3 is axis of J4 (yaw)

    const T4 = poses[4].orientation.elements;
    const z4 = new Vector3D(T4[0], T4[4], T4[8]); // Local X axis of wrist is axis of J5 (pitch)

    const z5 = new Vector3D(T4[2], T4[6], T4[10]); // Local Z axis of wrist is axis of J6 (roll)

    // Col 0: J1 Revolute Y
    const col0_L = z0.cross(p_e.subtract(p0));
    const col0_A = z0;
    this.setJacobianColumn(J, 0, col0_L, col0_A);

    // Col 1: J2 Revolute X
    const col1_L = z1.cross(p_e.subtract(p1));
    const col1_A = z1;
    this.setJacobianColumn(J, 1, col1_L, col1_A);

    // Col 2: J3 Prismatic Y (Linear slide)
    const col2_L = z2; // Only linear velocity along axis
    const col2_A = new Vector3D(0, 0, 0);
    this.setJacobianColumn(J, 2, col2_L, col2_A);

    // Col 3: J4 Revolute Y (Wrist Yaw)
    const col3_L = z3.cross(p_e.subtract(p3));
    const col3_A = z3;
    this.setJacobianColumn(J, 3, col3_L, col3_A);

    // Col 4: J5 Revolute X (Wrist Pitch)
    const col4_L = z4.cross(p_e.subtract(p3)); // Rotate about wrist center p3
    const col4_A = z4;
    this.setJacobianColumn(J, 4, col4_L, col4_A);

    // Col 5: J6 Revolute Z (Wrist Roll)
    const col5_L = z5.cross(p_e.subtract(p3));
    const col5_A = z5;
    this.setJacobianColumn(J, 5, col5_L, col5_A);

    return J;
  }

  /**
   * Helper to write Vector3D structures into a column of a 2D array.
   */
  private static setJacobianColumn(J: number[][], col: number, linear: Vector3D, angular: Vector3D) {
    J[0][col] = linear.x;
    J[1][col] = linear.y;
    J[2][col] = linear.z;
    J[3][col] = angular.x;
    J[4][col] = angular.y;
    J[5][col] = angular.z;
  }

  /**
   * Calculates Yoshikawa's Manipulability index.
   * For a square Jacobian, w = |det(J)|.
   * If w is close to 0, the robot is in a singular configuration (lacks mobility along some axis).
   */
  public static calculateManipulability(jointValues: number[]): number {
    const J = this.computeJacobian(jointValues);
    
    // Calculate determinant of 6x6 matrix using Gaussian elimination (LU method)
    const size = 6;
    const A = J.map(row => [...row]); // Deep copy
    let det = 1;

    for (let i = 0; i < size; i++) {
      // Find pivot
      let pivotRow = i;
      for (let r = i + 1; r < size; r++) {
        if (Math.abs(A[r][i]) > Math.abs(A[pivotRow][i])) {
          pivotRow = r;
        }
      }

      // Swap rows if necessary
      if (pivotRow !== i) {
        const temp = A[i];
        A[i] = A[pivotRow];
        A[pivotRow] = temp;
        det *= -1;
      }

      // Singular check
      if (Math.abs(A[i][i]) < 1e-9) {
        return 0.0;
      }

      // Eliminate elements below pivot
      det *= A[i][i];
      for (let r = i + 1; r < size; r++) {
        const factor = A[r][i] / A[i][i];
        for (let c = i; c < size; c++) {
          A[r][c] -= factor * A[i][c];
        }
      }
    }

    return Math.abs(det);
  }

  /**
   * Dynamic Modeling: Dynamic Gravity Torques
   * Computes static holding loads (torques in N*m) for all 6 joints.
   * Highly loaded cantilever configurations will yield higher torque requirements.
   */
  public static computeGravityTorques(jointValues: number[]): number[] {
    const q2 = jointValues[1] || 0; // J2 Shoulder Pitch angle
    const q3 = jointValues[2] || 0; // J3 Telescopic extension
    const q5 = jointValues[4] || 0; // J5 Wrist Pitch angle

    const torques = Array(6).fill(0.0);

    // J1 Base Yaw: Axis of rotation is vertical (along gravity vector). Torque is zero.
    torques[0] = 0.0;

    // J2 Shoulder Pitch: Subject to massive gravity cantilever loads
    // Torque = - m * g * r * sin(q2), where r depends on telescopic joint extension
    const r_forearm = 0.25 + q3; // CoM distance
    const J2_torque = 
      (this.M_FOREARM * this.G * r_forearm * 0.5) * Math.sin(q2) +
      (this.M_GRIPPER * this.G * r_forearm) * Math.sin(q2);
    torques[1] = Math.abs(J2_torque);

    // J3 Prismatic slide: Force (in Newtons) required to lift upper arm against gravity
    // Force = m * g * cos(q2)
    const J3_force = (this.M_FOREARM * 0.4 + this.M_GRIPPER) * this.G * Math.cos(q2);
    torques[2] = Math.abs(J3_force);

    // J4 Wrist Yaw: Vertical axis of rotation, zero gravity load
    torques[3] = 0.0;

    // J5 Wrist Pitch: Subject to local gripper torque loads
    // Torque = m_gripper * g * r_gripper * sin(q2 + q5)
    const J5_torque = (this.M_GRIPPER * this.G * 0.04) * Math.sin(q2 + q5);
    torques[4] = Math.abs(J5_torque);

    // J6 Wrist Roll: CoM aligned with roll axis, zero torque load
    torques[5] = 0.0;

    return torques;
  }
}
export default DynamicsSolver;
