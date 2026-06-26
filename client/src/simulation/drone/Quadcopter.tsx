import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface QuadcopterProps {
  position: [number, number, number];
  rotation: [number, number, number];
}

/**
 * Quadcopter renders a detailed 3D model of an aerial mapping drone in Three.js.
 * Renders a central carbon-fiber fuselage, four structural arms, red/green navigation LEDs,
 * and high-speed spinning propellers.
 */
export const Quadcopter: React.FC<QuadcopterProps> = ({ position, rotation }) => {
  const prop1Ref = useRef<THREE.Mesh>(null);
  const prop2Ref = useRef<THREE.Mesh>(null);
  const prop3Ref = useRef<THREE.Mesh>(null);
  const prop4Ref = useRef<THREE.Mesh>(null);

  // Spin propellers dynamically on every frame to simulate high-RPM thrust
  useFrame((state) => {
    const angle = state.clock.getElapsedTime() * 48.0;
    if (prop1Ref.current) prop1Ref.current.rotation.y = angle;
    if (prop2Ref.current) prop2Ref.current.rotation.y = -angle;
    if (prop3Ref.current) prop3Ref.current.rotation.y = angle;
    if (prop4Ref.current) prop4Ref.current.rotation.y = -angle;
  });

  const armLength = 0.55;
  const propRadius = 0.22;

  return (
    <group position={position} rotation={rotation}>
      {/* 1. Fuselage Central Core Pod */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.15} />
      </mesh>
      
      {/* Flight Controller Shell Accent */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.16, 0.08, 12]} />
        <meshStandardMaterial color="#06b6d4" metalness={0.9} roughness={0.1} emissive="#06b6d4" emissiveIntensity={0.25} />
      </mesh>

      {/* 2. Structural Quadcopter Arms (X-Configuration) */}
      {[
        [armLength, armLength],   // Front-Right (Red Propeller indicator)
        [-armLength, armLength],  // Front-Left (Red Propeller indicator)
        [armLength, -armLength],  // Back-Right (Cyan Propeller indicator)
        [-armLength, -armLength]  // Back-Left (Cyan Propeller indicator)
      ].map(([dx, dz], idx) => {
        const angle = Math.atan2(dz, dx);
        const key = `arm-${idx}`;
        const isFront = dz > 0;

        return (
          <group key={key} rotation={[0, -angle, 0]}>
            {/* Structural Carbon-Fiber Rod */}
            <mesh position={[armLength / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.02, 0.025, armLength, 8]} />
              <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
            </mesh>

            {/* Motor Canopy at arm tip */}
            <mesh position={[armLength, 0.03, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.05, 0.08, 10]} />
              <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
            </mesh>

            {/* Navigation Tip LED Lights (Red for Front, Green/Cyan for Rear) */}
            <mesh position={[armLength, -0.025, 0]}>
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshBasicMaterial color={isFront ? '#ef4444' : '#10b981'} />
            </mesh>

            {/* Propeller Mount and Spinning Blade */}
            <group position={[armLength, 0.08, 0]}>
              {/* Propeller hub spinner */}
              <mesh>
                <sphereGeometry args={[0.02, 8, 8]} />
                <meshStandardMaterial color="#020617" />
              </mesh>

              {/* Propeller blades (referenced for spinning animation) */}
              <mesh ref={idx === 0 ? prop1Ref : idx === 1 ? prop2Ref : idx === 2 ? prop3Ref : prop4Ref} castShadow>
                <boxGeometry args={[propRadius * 2, 0.005, 0.02]} />
                <meshStandardMaterial 
                  color={isFront ? '#b91c1c' : '#0891b2'} // Red front blades, cyan rear blades
                  transparent 
                  opacity={0.88} 
                  roughness={0.5}
                />
              </mesh>
            </group>
          </group>
        );
      })}

      {/* 3. Sensor Payload & Camera Gimbal (Mounted underneath central core) */}
      <mesh position={[0, -0.16, 0.05]} castShadow>
        <sphereGeometry args={[0.065, 12, 12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} />
      </mesh>
      
      {/* Downward Projecting Scanner Laser Cone */}
      <mesh position={[0, -1.8, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.01, 2.5, 3.2, 16, 1, true]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.06} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

export default Quadcopter;
