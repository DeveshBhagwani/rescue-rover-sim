import { Vector3D } from './Vector3D';

/**
 * Matrix4x4 represents a homogeneous transformation matrix in 3D space.
 * 
 * Layout (Row-Major array indices):
 * [  0   1   2   3 ] -> [ R11  R12  R13  Tx ]
 * [  4   5   6   7 ] -> [ R21  R22  R23  Ty ]
 * [  8   9  10  11 ] -> [ R31  R32  R33  Tz ]
 * [ 12  13  14  15 ] -> [  0    0    0    1 ]
 * 
 * Rigid body poses are calculated by chain-multiplying transformations:
 * T_world_to_effector = T_01(q1) * T_12(q2) * ... * T_56(q6)
 */
export class Matrix4x4 {
  public elements: number[];

  constructor(elements?: number[]) {
    this.elements = elements || [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ];
  }

  /**
   * Generates a 4x4 Identity Matrix.
   */
  public static identity(): Matrix4x4 {
    return new Matrix4x4();
  }

  /**
   * Generates a pure Translation homogeneous matrix.
   * [ 1  0  0  x ]
   * [ 0  1  0  y ]
   * [ 0  0  1  z ]
   * [ 0  0  0  1 ]
   */
  public static translation(x: number, y: number, z: number): Matrix4x4 {
    return new Matrix4x4([
      1, 0, 0, x,
      0, 1, 0, y,
      0, 0, 1, z,
      0, 0, 0, 1
    ]);
  }

  /**
   * Generates a rotation matrix around the X axis by angle theta (radians).
   * [ 1      0            0       0 ]
   * [ 0  cos(theta)  -sin(theta)  0 ]
   * [ 0  sin(theta)   cos(theta)  0 ]
   * [ 0      0            0       1 ]
   */
  public static rotationX(theta: number): Matrix4x4 {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return new Matrix4x4([
      1, 0,  0, 0,
      0, c, -s, 0,
      0, s,  c, 0,
      0, 0,  0, 1
    ]);
  }

  /**
   * Generates a rotation matrix around the Y axis by angle theta (radians).
   * [  cos(theta)  0  sin(theta)  0 ]
   * [      0       1      0       0 ]
   * [ -sin(theta)  0  cos(theta)  0 ]
   * [      0       0      0       1 ]
   */
  public static rotationY(theta: number): Matrix4x4 {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return new Matrix4x4([
       c, 0, s, 0,
       0, 1, 0, 0,
      -s, 0, c, 0,
       0, 0, 0, 1
    ]);
  }

  /**
   * Generates a rotation matrix around the Z axis by angle theta (radians).
   * [ cos(theta)  -sin(theta)  0  0 ]
   * [ sin(theta)   cos(theta)  0  0 ]
   * [      0            0      1  0 ]
   * [      0            0      0  1 ]
   */
  public static rotationZ(theta: number): Matrix4x4 {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    return new Matrix4x4([
      c, -s, 0, 0,
      s,  c, 0, 0,
      0,  0, 1, 0,
      0,  0, 0, 1
    ]);
  }

  /**
   * Multiplies this matrix A by another matrix B (A * B).
   * Standard Row-Column dot product: C_ij = sum_k(A_ik * B_kj)
   */
  public multiply(b: Matrix4x4): Matrix4x4 {
    const ae = this.elements;
    const be = b.elements;
    const te = new Array<number>(16);

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += ae[row * 4 + k] * be[k * 4 + col];
        }
        te[row * 4 + col] = sum;
      }
    }

    return new Matrix4x4(te);
  }

  /**
   * Applies this transformation matrix to a 3D Vector by treating it as
   * a homogeneous coordinate: v_h = [x, y, z, 1]^T.
   * R = M * v_h
   */
  public multiplyVector(v: Vector3D): Vector3D {
    const e = this.elements;
    const x = e[0] * v.x + e[1] * v.y + e[2] * v.z + e[3];
    const y = e[4] * v.x + e[5] * v.y + e[6] * v.z + e[7];
    const z = e[8] * v.x + e[9] * v.y + e[10] * v.z + e[11];
    // Homogeneous divisor w is ignored assuming affine transforms where e[12..15] = [0,0,0,1]
    return new Vector3D(x, y, z);
  }

  /**
   * Extract the translation component from the matrix.
   */
  public getTranslation(): Vector3D {
    const e = this.elements;
    return new Vector3D(e[3], e[7], e[11]);
  }

  /**
   * Clone this matrix.
   */
  public clone(): Matrix4x4 {
    return new Matrix4x4([...this.elements]);
  }
}
export default Matrix4x4;
