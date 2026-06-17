import { Vector3D } from './Vector3D';

/**
 * SensorFusion implements a 3D Kalman Filter to estimate the exact coordinate
 * of the extraction target canister. It fuses:
 * 1. Noisy camera bearing detections (angular vision vector).
 * 2. Noisy Lidar proximity range calculations.
 * 
 * Kalman Equations:
 * - Prediction:
 *   x_k|k-1 = A * x_k-1 (with static target, A = Identity)
 *   P_k|k-1 = P_k-1 + Q  (Q is process noise covariance)
 * - Measurement Update:
 *   K = P_k|k-1 * H^T * (H * P_k|k-1 * H^T + R)^-1  (H = Identity, R is sensor noise)
 *   x_k = x_k|k-1 + K * (z - x_k|k-1)
 *   P_k = (Identity - K) * P_k|k-1
 */
export class SensorFusion {
  // Filter states: Estimated target position
  private x: Vector3D;
  // State uncertainty covariance diagonals
  private pCov: Vector3D;

  // Process noise covariance (static target, very low variance)
  private readonly Q = new Vector3D(1e-6, 1e-6, 1e-6);
  // Sensor noise covariances (Camera has high angular noise, Lidar has low distance noise)
  private readonly R_CAM = new Vector3D(0.08, 0.08, 0.08); // Camera noise variance
  private readonly R_LID = new Vector3D(0.01, 0.01, 0.01); // Lidar noise variance

  constructor(initialGuess = new Vector3D(0, 0, 0)) {
    this.x = initialGuess;
    this.pCov = new Vector3D(1.0, 1.0, 1.0); // High initial uncertainty
  }

  /**
   * Reset filter estimation states.
   */
  public reset(initialGuess = new Vector3D(0, 0, 0)): void {
    this.x = initialGuess;
    this.pCov = new Vector3D(1.0, 1.0, 1.0);
  }

  /**
   * Run a single prediction step.
   * Target is stationary, so state is constant but uncertainty grows slightly.
   */
  public predict(): void {
    this.pCov = this.pCov.add(this.Q);
  }

  /**
   * Perform measurement update step.
   * 
   * @param z Measured position vector from sensor
   * @param isLidar true if measurement is from Lidar (uses R_LID), false if from Camera (uses R_CAM)
   * @returns Fused estimated position Vector3D
   */
  public update(z: Vector3D, isLidar: boolean): Vector3D {
    const R = isLidar ? this.R_LID : this.R_CAM;

    // Solve Kalman gain for X axis
    const kX = this.pCov.x / (this.pCov.x + R.x);
    const estX = this.x.x + kX * (z.x - this.x.x);
    const pX = (1 - kX) * this.pCov.x;

    // Solve Kalman gain for Y axis
    const kY = this.pCov.y / (this.pCov.y + R.y);
    const estY = this.x.y + kY * (z.y - this.x.y);
    const pY = (1 - kY) * this.pCov.y;

    // Solve Kalman gain for Z axis
    const kZ = this.pCov.z / (this.pCov.z + R.z);
    const estZ = this.x.z + kZ * (z.z - this.x.z);
    const pZ = (1 - kZ) * this.pCov.z;

    this.x = new Vector3D(estX, estY, estZ);
    this.pCov = new Vector3D(pX, pY, pZ);

    return this.x.clone();
  }

  /**
   * Get the current estimated coordinate vector.
   */
  public getEstimate(): Vector3D {
    return this.x.clone();
  }
}
export default SensorFusion;
