import React from 'react';

interface RubbleItem {
  id: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  type: 'box' | 'cylinder' | 'sphere';
}

/**
 * Rubbles renders procedural, static rubble segments inside the simulation.
 * These act as obstacles for SLAM mapping and path-planning tests.
 */
export const Rubbles: React.FC = () => {
  // Pre-defined rubble coordinates to keep generation deterministic
  const rubbleList: RubbleItem[] = [
    { id: 1, position: [-3, 0.4, 3], rotation: [0.2, 0.5, 0.1], scale: [1.2, 0.8, 1.2], color: '#475569', type: 'box' },
    { id: 2, position: [3, 0.3, -3], rotation: [-0.1, 0.2, 0.4], scale: [1.5, 0.6, 1.0], color: '#64748B', type: 'box' },
    { id: 3, position: [-2, 0.5, -4], rotation: [0.5, -0.4, 0.8], scale: [0.8, 1.0, 0.8], color: '#334155', type: 'cylinder' },
    { id: 4, position: [4, 0.4, 2], rotation: [0.1, 0.1, -0.2], scale: [1.0, 0.8, 1.0], color: '#475569', type: 'box' },
    { id: 5, position: [0, 0.25, 5], rotation: [0, 0.7, 0], scale: [2.0, 0.5, 0.8], color: '#1E293B', type: 'box' },
    { id: 6, position: [-5, 0.6, 0], rotation: [0.3, 0.3, 0.3], scale: [0.7, 1.2, 0.7], color: '#57534E', type: 'cylinder' },
    { id: 7, position: [5, 0.5, 5], rotation: [0, 0, 0], scale: [1.0, 1.0, 1.0], color: '#44403C', type: 'sphere' },
    { id: 8, position: [1.5, 0.2, 2.5], rotation: [0.4, -0.2, 0.1], scale: [0.6, 0.4, 0.8], color: '#78716C', type: 'box' },
    { id: 9, position: [-1.5, 0.3, 1.5], rotation: [-0.3, 0.4, -0.5], scale: [0.7, 0.6, 0.7], color: '#52525B', type: 'box' }
  ];

  return (
    <group>
      {rubbleList.map((item) => {
        const key = `rubble-${item.id}`;
        
        if (item.type === 'box') {
          return (
            <mesh key={key} position={item.position} rotation={item.rotation} castShadow receiveShadow>
              <boxGeometry args={item.scale} />
              <meshStandardMaterial color={item.color} roughness={0.9} metalness={0.1} />
            </mesh>
          );
        } else if (item.type === 'cylinder') {
          return (
            <mesh key={key} position={item.position} rotation={item.rotation} castShadow receiveShadow>
              <cylinderGeometry args={[item.scale[0]/2, item.scale[2]/2, item.scale[1], 16]} />
              <meshStandardMaterial color={item.color} roughness={0.8} metalness={0.2} />
            </mesh>
          );
        } else {
          return (
            <mesh key={key} position={item.position} rotation={item.rotation} castShadow receiveShadow>
              <sphereGeometry args={[item.scale[0]/2, 16, 16]} />
              <meshStandardMaterial color={item.color} roughness={0.9} metalness={0.1} />
            </mesh>
          );
        }
      })}
    </group>
  );
};

export default Rubbles;
