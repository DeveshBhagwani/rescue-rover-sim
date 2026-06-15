import React from 'react';

interface PrismaticJointProps {
  extension: number; // Joint variable (translation in meters)
  axis?: 'x' | 'y' | 'z'; // Axis of translation
  length?: number;
  width?: number;
  children?: React.ReactNode;
}

/**
 * PrismaticJoint models a 1-DOF linear sliding actuator.
 * It translates its child frame by `extension` meters along the `axis`.
 */
export const PrismaticJoint: React.FC<PrismaticJointProps> = ({
  extension,
  axis = 'y',
  length = 0.2,
  width = 0.06,
  children
}) => {
  // Apply linear translation along selected axis
  const translation: [number, number, number] =
    axis === 'x' ? [extension, 0, 0] :
    axis === 'y' ? [0, extension, 0] :
    [0, 0, extension];

  // Visual sleeve geometry rotations
  const sleeveRotation: [number, number, number] =
    axis === 'x' ? [0, 0, Math.PI / 2] :
    axis === 'z' ? [Math.PI / 2, 0, 0] :
    [0, 0, 0];

  return (
    <group>
      {/* Outer Sleeve (Fixed Base of Prismatic Slide) */}
      <mesh castShadow>
        <boxGeometry args={[width, length, width]} />
        <meshStandardMaterial 
          color="#334155" // Slate 700 
          roughness={0.5} 
          metalness={0.5} 
        />
      </mesh>

      {/* Inner Slider / Piston (Translating Component) */}
      <group position={translation}>
        <mesh castShadow rotation={sleeveRotation}>
          <cylinderGeometry args={[width * 0.3, width * 0.3, length * 0.9, 16]} />
          <meshStandardMaterial 
            color="#A855F7" // Purple accent for prismatic piston
            roughness={0.2} 
            metalness={0.9} 
          />
        </mesh>
        
        {/* Child links nested inside translated coordinate system */}
        {children}
      </group>
    </group>
  );
};

export default PrismaticJoint;
