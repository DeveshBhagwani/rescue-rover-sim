import React from 'react';

interface LinkProps {
  length: number;
  radius?: number;
  color?: string;
  axis?: 'x' | 'y' | 'z';
}

/**
 * Link renders a rigid cylindrical body connecting joints.
 * Decouples structural dimensions from active joint movement logic.
 */
export const Link: React.FC<LinkProps> = ({ 
  length, 
  radius = 0.04, 
  color = '#475569', 
  axis = 'y' 
}) => {
  // Determine rotation based on alignment axis
  const rotation: [number, number, number] = 
    axis === 'x' ? [0, 0, -Math.PI / 2] : 
    axis === 'z' ? [Math.PI / 2, 0, 0] : 
    [0, 0, 0];

  // Shift geometry so the origin is at the base of the link, extending upwards/outwards
  const positionOffset: [number, number, number] = 
    axis === 'x' ? [length / 2, 0, 0] : 
    axis === 'z' ? [0, 0, length / 2] : 
    [0, length / 2, 0];

  return (
    <group>
      <mesh castShadow receiveShadow rotation={rotation} position={positionOffset}>
        <cylinderGeometry args={[radius, radius * 0.9, length, 16]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.4} 
          metalness={0.6} 
        />
      </mesh>
    </group>
  );
};

export default Link;
