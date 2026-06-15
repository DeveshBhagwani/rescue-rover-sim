import React from 'react';
import RoverWheel from './RoverWheel';

interface RoverBaseProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  children?: React.ReactNode; // Typically mounts the robotic arm
}

/**
 * RoverBase renders the differential drive mobile chassis.
 * Dimensions conform to a standard medium search-and-rescue rover:
 * - Width (Wheelbase): 0.55m
 * - Length: 0.7m
 * - Height: 0.15m
 */
export const RoverBase: React.FC<RoverBaseProps> = ({ 
  position = [0, 0.12, 0], // Elevated slightly to clear wheels
  rotation = [0, 0, 0],
  children 
}) => {
  const halfLength = 0.35;
  const halfWidth = 0.275;

  return (
    <group position={position} rotation={rotation}>
      {/* Main Chassis Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.15, 0.7]} />
        <meshStandardMaterial 
          color="#1E293B" 
          roughness={0.4} 
          metalness={0.7} 
        />
      </mesh>

      {/* Futuristic accent striping */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.51, 0.01, 0.71]} />
        <meshStandardMaterial color="#06B6D4" emissive="#06B6D4" emissiveIntensity={0.5} />
      </mesh>

      {/* Lidar housing (mounted on the front/top) */}
      <group position={[0, 0.11, 0.25]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.06, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Spinning lidar cap */}
        <mesh position={[0, 0.04, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.02, 16]} />
          <meshStandardMaterial color="#0F172A" />
        </mesh>
      </group>

      {/* Stereo Camera Bracket on the front */}
      <mesh position={[0, 0.04, 0.36]} castShadow>
        <boxGeometry args={[0.15, 0.04, 0.03]} />
        <meshStandardMaterial color="#475569" metalness={0.5} />
      </mesh>

      {/* 4-Wheel Assembly */}
      {/* Left Front Wheel */}
      <RoverWheel position={[-halfWidth, 0, halfLength - 0.1]} name="wheel_lf" />
      {/* Right Front Wheel */}
      <RoverWheel position={[halfWidth, 0, halfLength - 0.1]} name="wheel_rf" />
      {/* Left Rear Wheel */}
      <RoverWheel position={[-halfWidth, 0, -halfLength + 0.1]} name="wheel_lr" />
      {/* Right Rear Wheel */}
      <RoverWheel position={[halfWidth, 0, -halfLength + 0.1]} name="wheel_rr" />

      {/* Arm Mounting Plate (realigned to the rear top of the chassis) */}
      <group position={[0, 0.08, -0.15]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.02, 32]} />
          <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.8} />
        </mesh>
        
        {/* Mount robotic arm children links nested inside local frame */}
        <group position={[0, 0.01, 0]}>
          {children}
        </group>
      </group>
    </group>
  );
};

export default RoverBase;
