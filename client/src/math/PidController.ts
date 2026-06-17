/**
 * PidController implements a generic Proportional-Integral-Derivative feedback controller.
 * 
 * Control Formula:
 * u(t) = Kp * e(t) + Ki * integral(e(t) dt) + Kd * (de(t)/dt)
 * - Proportional (Kp): Corrects current error.
 * - Integral (Ki): Corrects accumulated past errors (offsets steady-state errors).
 * - Derivative (Kd): Dampens rate of error changes (prevents overshoot).
 */
export class PidController {
  private kp: number;
  private ki: number;
  private kd: number;
  
  private integral = 0;
  private prevError = 0;
  private maxLimit: number;
  private minLimit: number;

  constructor(kp: number, ki: number, kd: number, min = -Infinity, max = Infinity) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
    this.minLimit = min;
    this.maxLimit = max;
  }

  /**
   * Computes the control output based on error and elapsed time.
   * 
   * @param error The tracking error (target - actual)
   * @param dt Sampling time step in seconds
   * @returns Clamped control command signal
   */
  public calculate(error: number, dt: number): number {
    if (dt <= 0) return 0;

    // Proportional Term
    const P = this.kp * error;

    // Integral Term (with basic anti-windup clamping)
    this.integral += error * dt;
    const I = this.ki * this.integral;

    // Derivative Term
    const derivative = (error - this.prevError) / dt;
    const D = this.kd * derivative;

    this.prevError = error;

    const output = P + I + D;

    // Clamp output commands to prevent actuator saturation
    return Math.max(this.minLimit, Math.min(this.maxLimit, output));
  }

  /**
   * Reset the accumulator states.
   */
  public reset(): void {
    this.integral = 0;
    this.prevError = 0;
  }

  /**
   * Set control gains dynamically.
   */
  public setGains(kp: number, ki: number, kd: number): void {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
  }
}
export default PidController;
