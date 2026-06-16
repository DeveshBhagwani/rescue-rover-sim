/**
 * TrajectoryPlanner solves quintic polynomial boundary values to generate
 * jerk-free joint transition profiles between start and target configurations.
 * 
 * Polynomial Formulation:
 * s(t) = a0 + a1*t + a2*t^2 + a3*t^3 + a4*t^4 + a5*t^5
 * 
 * Boundary Conditions:
 * - Position: s(0) = q0, s(T) = qf
 * - Velocity: ds(0)/dt = 0, ds(T)/dt = 0
 * - Acceleration: d^2s(0)/dt^2 = 0, d^2s(T)/dt^2 = 0
 */
export class TrajectoryPlanner {
  /**
   * Interpolate a single scalar value from start to end at current time t.
   * 
   * @param q0 Start position value
   * @param qf Target position value
   * @param T Total duration of movement in seconds
   * @param t Current elapsed time in seconds (clamped internally [0, T])
   * @returns Current position, velocity, and acceleration
   */
  public static interpolateScalar(q0: number, qf: number, T: number, t: number) {
    // Clamp time boundaries
    const time = Math.max(0, Math.min(T, t));

    if (T <= 0) {
      return { position: qf, velocity: 0, acceleration: 0 };
    }

    const h = qf - q0;
    
    // Quintic polynomial analytical coefficients
    const a0 = q0;
    // a1 = 0, a2 = 0 are boundary condition zeros
    const a3 = (10 * h) / Math.pow(T, 3);
    const a4 = (-15 * h) / Math.pow(T, 4);
    const a5 = (6 * h) / Math.pow(T, 5);

    // Compute polynomial values at elapsed time
    const position = a0 + a3 * Math.pow(time, 3) + a4 * Math.pow(time, 4) + a5 * Math.pow(time, 5);
    const velocity = 3 * a3 * Math.pow(time, 2) + 4 * a4 * Math.pow(time, 3) + 5 * a5 * Math.pow(time, 4);
    const acceleration = 6 * a3 * time + 12 * a4 * Math.pow(time, 2) + 20 * a5 * Math.pow(time, 3);

    return { position, velocity, acceleration };
  }

  /**
   * Interpolates an entire joint array profile.
   * 
   * @param startJoints Array of start joint angles/translations
   * @param targetJoints Array of target joint angles/translations
   * @param duration Total trajectory duration in seconds
   * @param elapsedTime Elapsed time in seconds
   */
  public static interpolateJoints(
    startJoints: number[],
    targetJoints: number[],
    duration: number,
    elapsedTime: number
  ): { positions: number[]; velocities: number[]; accelerations: number[] } {
    const size = Math.min(startJoints.length, targetJoints.length);
    const positions = new Array<number>(size);
    const velocities = new Array<number>(size);
    const accelerations = new Array<number>(size);

    for (let i = 0; i < size; i++) {
      const { position, velocity, acceleration } = this.interpolateScalar(
        startJoints[i],
        targetJoints[i],
        duration,
        elapsedTime
      );
      positions[i] = position;
      velocities[i] = velocity;
      accelerations[i] = acceleration;
    }

    return { positions, velocities, accelerations };
  }
}
export default TrajectoryPlanner;
