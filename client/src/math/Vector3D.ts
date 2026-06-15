/**
 * Vector3D represents a 3D coordinate or vector in Euclidean space.
 * This class is mathematically decoupled from the rendering libraries (Three.js) to enforce
 * strict separation of concerns, ensuring kinematics and physics models can run independently.
 */
export class Vector3D {
  public x: number;
  public y: number;
  public z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Adds another vector to this vector.
   * R = A + B => (Ax + Bx, Ay + By, Az + Bz)
   */
  public add(v: Vector3D): Vector3D {
    return new Vector3D(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  /**
   * Subtracts another vector from this vector.
   * R = A - B => (Ax - Bx, Ay - By, Az - Bz)
   */
  public subtract(v: Vector3D): Vector3D {
    return new Vector3D(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  /**
   * Multiplies this vector by a scalar.
   * R = k * A => (k * Ax, k * Ay, k * Az)
   */
  public scale(s: number): Vector3D {
    return new Vector3D(this.x * s, this.y * s, this.z * s);
  }

  /**
   * Computes the dot product (scalar product) of this vector and another.
   * A . B = Ax*Bx + Ay*By + Az*Bz = |A||B|cos(theta)
   * A dot product of 0 indicates the vectors are orthogonal (perpendicular).
   */
  public dot(v: Vector3D): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  /**
   * Computes the cross product (vector product) of this vector and another.
   * R = A x B => (Ay*Bz - Az*By, Az*Bx - Ax*Bz, Ax*By - Ay*Bx)
   * The cross product yields a vector that is mutually orthogonal to both A and B,
   * essential for determining torque axes or normal planes in joint space.
   */
  public cross(v: Vector3D): Vector3D {
    return new Vector3D(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  /**
   * Calculates the magnitude (Euclidean length) of the vector.
   * |A| = sqrt(Ax^2 + Ay^2 + Az^2)
   */
  public magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /**
   * Returns a normalized unit vector in the same direction.
   * u = A / |A|
   * If the magnitude is 0, returns a zero vector.
   */
  public normalize(): Vector3D {
    const mag = this.magnitude();
    if (mag === 0) return new Vector3D(0, 0, 0);
    return this.scale(1 / mag);
  }

  /**
   * Calculates the Euclidean distance between this vector and another.
   * d = sqrt((Ax - Bx)^2 + (Ay - By)^2 + (Az - Bz)^2)
   */
  public distanceTo(v: Vector3D): number {
    return this.subtract(v).magnitude();
  }

  /**
   * Clones this vector.
   */
  public clone(): Vector3D {
    return new Vector3D(this.x, this.y, this.z);
  }
}
