import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Group } from 'three';
import { useSimulation } from '../../context/SimulationContext';

/**
 * ExtractionTarget renders the target canister to be retrieved by the robotic arm.
 * It also visualizes:
 * 1. The true target canister at its static world coordinate.
 * 2. The green 3D locking reticle centered at the Kalman-fused position.
 * 3. The raw, noisy sensor reading indicators (camera as red, lidar as blue) to demonstrate filtering.
 */
export const ExtractionTarget: React.FC = () => {
  const {
    fusedTargetPos,
    rawCameraPos,
    rawLidarPos,
    isGrasping,
    graspingForce
  } = useSimulation();

  const reticleRef = useRef<Group>(null);

  // Animate the reticle (subtle rotation and pulsing) to make it look active
  useFrame((state) => {
    if (reticleRef.current) {
      reticleRef.current.rotation.y = state.clock.getElapsedTime() * 0.5;
    }
  });

  // True target canister position
  const truePos: [number, number, number] = [-1.5, 0.7, 1.5];

  // Helper to draw wireframe corner bracket lines for a 3D bounding box reticle
  const half = 0.15; // half-width of the 3D target box

  // Render brackets around the estimated/fused position
  return (
    <group>
      {/* 1. TRUE TARGET CANISTER */}
      <group position={truePos}>
        {/* Canister Main Body */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.07, 0.07, 0.22, 16]} />
          <meshStandardMaterial
            color="#F97316"
            emissive="#EA580C"
            emissiveIntensity={0.4}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        {/* Canister Cap */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.04, 16]} />
          <meshStandardMaterial color="#1E293B" roughness={0.5} metalness={0.5} />
        </mesh>
        {/* Canister Warning Stripe */}
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.071, 0.071, 0.03, 16]} />
          <meshStandardMaterial color="#EAB308" roughness={0.4} />
        </mesh>
        {/* Biohazard Symbol representation (small dark cylinder inside body) */}
        <mesh position={[0, 0.03, 0.068]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.005, 8]} />
          <meshStandardMaterial color="#000000" roughness={0.9} />
        </mesh>
      </group>

      {/* 2. NOISY CAMERA MEASUREMENT INDICATOR (Red faint sphere) */}
      <mesh position={rawCameraPos}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color="#EF4444" transparent opacity={0.6} />
      </mesh>

      {/* 3. NOISY LIDAR MEASUREMENT INDICATOR (Blue faint sphere) */}
      <mesh position={rawLidarPos}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color="#3B82F6" transparent opacity={0.6} />
      </mesh>

      {/* 4. KALMAN-FUSED ESTIMATION TARGET LOCK RETICLE (Green wireframe box) */}
      <group position={fusedTargetPos} ref={reticleRef}>
        {/* Glowing Green Reticle Box */}
        <mesh>
          <boxGeometry args={[half * 2, 0.3, half * 2]} />
          <meshBasicMaterial
            color="#22C55E"
            wireframe
            transparent
            opacity={0.3}
          />
        </mesh>

        {/* Outer Corner brackets using tiny box meshes */}
        {/* Top Corners */}
        <mesh position={[-half, 0.15, -half]}>
          <boxGeometry args={[0.01, 0.04, 0.01]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>
        <mesh position={[half, 0.15, -half]}>
          <boxGeometry args={[0.01, 0.04, 0.01]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>
        <mesh position={[-half, 0.15, half]}>
          <boxGeometry args={[0.01, 0.04, 0.01]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>
        <mesh position={[half, 0.15, half]}>
          <boxGeometry args={[0.01, 0.04, 0.01]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>
        {/* Bottom Corners */}
        <mesh position={[-half, -0.15, -half]}>
          <boxGeometry args={[0.01, 0.04, 0.01]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>
        <mesh position={[half, -0.15, -half]}>
          <boxGeometry args={[0.01, 0.04, 0.01]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>
        <mesh position={[-half, -0.15, half]}>
          <boxGeometry args={[0.01, 0.04, 0.01]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>
        <mesh position={[half, -0.15, half]}>
          <boxGeometry args={[0.01, 0.04, 0.01]} />
          <meshBasicMaterial color="#22C55E" />
        </mesh>

        {/* Floating HTML HUD label */}
        <Html distanceFactor={4} position={[0, 0.22, 0]} center>
          <div className="bg-slate-950/80 border border-green-500/50 rounded px-1.5 py-0.5 font-mono text-[8px] text-green-400 whitespace-nowrap select-none pointer-events-none uppercase shadow-lg">
            <div className="font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping" />
              LOCK ESTIMATE
            </div>
            <div>X: {fusedTargetPos[0].toFixed(2)}</div>
            <div>Y: {fusedTargetPos[1].toFixed(2)}</div>
            <div>Z: {fusedTargetPos[2].toFixed(2)}</div>
            {isGrasping && graspingForce > 0.1 && (
              <div className="text-cyan-400 font-bold border-t border-green-500/20 mt-0.5 pt-0.5">
                GRASP: {graspingForce.toFixed(1)} N
              </div>
            )}
          </div>
        </Html>
      </group>
    </group>
  );
};

export default ExtractionTarget;
