import React from 'react';

interface SphericalJointProps {
  yaw: number;   // Rotation about Y-axis (radians)
  pitch: number; // Rotation about X-axis (radians)
  roll: number;  // Rotation about Z-axis (radians)
  radius?: number;
  children?: React.ReactNode;
}

/**
 * SphericalJoint models a 3-DOF ball-and-socket joint.
 * Rotations are applied in Euler sequence (Y-X-Z: Yaw, Pitch, Roll).
 */
export const SphericalJoint: React.FC<SphericalJointProps> = ({
  yaw,
  pitch,
  roll,
  radius = 0.05,
  children
}) => {
  // Apply 3-DOF rotations (Yaw, Pitch, Roll)
  const rotation: [number, number, number] = [pitch, yaw, roll];

  return (
    <group rotation={rotation}>
      {/* Outer socket bracket */}
      <mesh castShadow>
        <sphereGeometry args={[radius * 1.1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial 
          color="#334155" 
          roughness={0.5} 
          metalness={0.4} 
          wireframe={false}
        />
      </mesh>

      {/* Inner ball bearing */}
      <mesh castShadow>
        <sphereGeometry args={[radius * 0.95, 16, 16]} />
        <meshStandardMaterial 
          color="#10B981" // Emerald accent for spherical ball
          roughness={0.1} 
          metalness={0.9} 
        />
      </mesh>

      {/* Child link nested inside 3-axis rotated frame */}
      {children}
    </group>
  );
};

export default SphericalJoint;
