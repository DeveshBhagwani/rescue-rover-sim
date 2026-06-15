import React from 'react';

interface RevoluteJointProps {
  angle: number; // Joint variable in radians
  axis?: 'x' | 'y' | 'z'; // Axis of rotation
  radius?: number;
  height?: number;
  children?: React.ReactNode;
}

/**
 * RevoluteJoint models a 1-DOF rotary actuator.
 * It applies a rotation of `angle` (radians) around the designated `axis`.
 * Nesting children within this component matches the kinematic chain hierarchy.
 */
export const RevoluteJoint: React.FC<RevoluteJointProps> = ({
  angle,
  axis = 'z',
  radius = 0.05,
  height = 0.08,
  children
}) => {
  // Convert axis indicator to group rotation angles
  const rotation: [number, number, number] = 
    axis === 'x' ? [angle, 0, 0] :
    axis === 'y' ? [0, angle, 0] :
    [0, 0, angle];

  // Visual orientation of joint cylinder (rotates around its axis)
  const cylinderRotation: [number, number, number] =
    axis === 'x' ? [0, 0, Math.PI / 2] :
    axis === 'y' ? [0, 0, 0] :
    [Math.PI / 2, 0, 0];

  return (
    <group rotation={rotation}>
      {/* Joint Actuator visual indicator */}
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, height, 16]} />
        <meshStandardMaterial 
          color="#06B6D4" // Cyan highlights active joint
          roughness={0.3} 
          metalness={0.7} 
        />
      </mesh>

      {/* Axis indicator line */}
      <mesh rotation={cylinderRotation}>
        <cylinderGeometry args={[0.005, 0.005, height * 1.5, 8]} />
        <meshBasicMaterial color="#EF4444" />
      </mesh>

      {/* Child link nested inside rotated coordinate system */}
      {children}
    </group>
  );
};

export default RevoluteJoint;
