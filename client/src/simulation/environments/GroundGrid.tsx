import React from 'react';

/**
 * GroundGrid renders a visual coordinate system for the simulation.
 * It contains a grid helper representing meters, and color-coded axis lines:
 * - Red Line: positive X-axis (Right)
 * - Green Line: positive Y-axis (Up)
 * - Blue Line: positive Z-axis (Forward)
 */
export const GroundGrid: React.FC = () => {
  return (
    <group position={[0, -0.01, 0]}>
      {/* 20x20 meter grid, with divisions every 1 meter */}
      <gridHelper args={[40, 40, '#06B6D4', '#1E293B']} />
      
      {/* Visual representation of origin coordinate axes */}
      <axesHelper args={[3]} />
      
      {/* Subtle bottom ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial 
          color="#0B132B" 
          roughness={0.8} 
          metalness={0.2}
          opacity={0.85}
          transparent
        />
      </mesh>
    </group>
  );
};

export default GroundGrid;
