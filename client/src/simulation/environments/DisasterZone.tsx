import React from 'react';
import GroundGrid from './GroundGrid';
import Rubbles from './Rubbles';

/**
 * DisasterZone aggregates all terrain features, lights, and obstacles
 * to construct the search & rescue environment.
 */
export const DisasterZone: React.FC = () => {
  return (
    <group>
      {/* Environmental Lighting */}
      <ambientLight intensity={0.4} />
      
      {/* Directional Sun Light representing external searchlight or sun */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />

      {/* Secondary fill light to lift shadows slightly */}
      <directionalLight position={[-10, 10, -10]} intensity={0.3} color="#06B6D4" />

      {/* Grid Reference */}
      <GroundGrid />

      {/* Obstacles / Rubble */}
      <Rubbles />
    </group>
  );
};

export default DisasterZone;
