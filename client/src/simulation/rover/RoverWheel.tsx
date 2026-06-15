import React from 'react';

interface RoverWheelProps {
  position: [number, number, number];
  name?: string;
}

/**
 * RoverWheel renders an individual wheel mesh for the mobile rover base.
 * Renders a cylinder rotated on its side along the X-axis (wheel axis of rotation).
 */
export const RoverWheel: React.FC<RoverWheelProps> = ({ position, name }) => {
  return (
    <group position={position} name={name}>
      {/* The main tire tread */}
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 0.08, 24]} />
        <meshStandardMaterial 
          color="#1E293B" 
          roughness={0.9} 
          metalness={0.1} 
        />
      </mesh>

      {/* The inner rim cap for premium look */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.082, 12]} />
        <meshStandardMaterial 
          color="#06B6D4" 
          roughness={0.5} 
          metalness={0.8} 
        />
      </mesh>

      {/* Dynamic bolt detailing for premium robotics styling */}
      <mesh position={[0.042, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.01, 0.06, 0.01]} />
        <meshStandardMaterial color="#F8FAFC" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  );
};

export default RoverWheel;
