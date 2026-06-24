import React from 'react';
import { useSimulation } from '../../context/SimulationContext';

interface RubbleItem {
  id: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  type: 'box' | 'cylinder' | 'sphere';
}

/**
 * Rubbles renders procedural or dynamic rubble segments inside the simulation.
 * These read from the active obstacles state in SimulationContext.
 */
export const Rubbles: React.FC = () => {
  const { activeObstacles } = useSimulation();

  // Map the active obstacles from context to 3D meshes deterministically
  const rubbleList: RubbleItem[] = activeObstacles.map((obs, idx) => {
    const hash = Math.abs(Math.sin(idx + obs.x * 12.3 + obs.z * 34.5));
    // Determine shapes: 50% boxes, 30% cylinders, 20% spheres
    let type: 'box' | 'cylinder' | 'sphere' = 'box';
    if (hash < 0.3) {
      type = 'sphere';
    } else if (hash < 0.6) {
      type = 'cylinder';
    }

    // Determine color from Slate and Stone hues
    const colors = ['#475569', '#64748B', '#334155', '#1E293B', '#57534E', '#44403C', '#52525B'];
    const color = colors[Math.floor(hash * colors.length) % colors.length];
    
    // Scale and heights
    const width = obs.radius * 2;
    const height = obs.radius * (1.2 + hash * 0.8);
    const depth = obs.radius * 2;

    return {
      id: idx,
      position: [obs.x, height / 2, obs.z],
      rotation: [hash * 0.4, hash * 1.5, hash * 0.2],
      scale: [width, height, depth],
      color,
      type
    };
  });

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
              <cylinderGeometry args={[item.scale[0]/2, item.scale[2]/2, item.scale[1], 12]} />
              <meshStandardMaterial color={item.color} roughness={0.8} metalness={0.2} />
            </mesh>
          );
        } else {
          return (
            <mesh key={key} position={item.position} rotation={item.rotation} castShadow receiveShadow>
              <sphereGeometry args={[item.scale[0]/2, 12, 12]} />
              <meshStandardMaterial color={item.color} roughness={0.9} metalness={0.1} />
            </mesh>
          );
        }
      })}
    </group>
  );
};

export default Rubbles;
