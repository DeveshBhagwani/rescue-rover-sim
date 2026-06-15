import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useSimulation } from '../context/SimulationContext';
import DisasterZone from './environments/DisasterZone';
import RoverBase from './rover/RoverBase';
import RobotArm from './arm/RobotArm';

/**
 * SceneContainer sets up the Three.js rendering pipeline.
 * By consuming states from SimulationContext, it binds the visual
 * position and rotations of the rover base and the nested joints.
 */
export const SceneContainer: React.FC = () => {
  const { jointValues, roverPosition, roverRotation } = useSimulation();

  return (
    <div className="w-full h-full relative bg-dark-bg">
      <Canvas
        shadows
        camera={{ position: [2, 3, 4], fov: 50 }}
        gl={{ antialias: true }}
      >
        {/* Sky/Fog style color overlay */}
        <color attach="background" args={['#090D1A']} />
        
        {/* Fog to represent dusty disaster environment conditions */}
        <fog attach="fog" args={['#090D1A', 8, 20]} />

        {/* Orbit Camera Controls */}
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.05} // Do not let camera go beneath ground
          minDistance={1}
          maxDistance={12}
        />

        {/* Disaster zone structures (ground, obstacles, lighting) */}
        <DisasterZone />

        {/* Mobile Rover with the nested robotic arm manipulator */}
        <RoverBase position={roverPosition} rotation={roverRotation}>
          <RobotArm jointValues={jointValues} />
        </RoverBase>
      </Canvas>

      {/* Floating 3D Navigation compass/gizmo indicator on bottom right */}
      <div className="absolute bottom-4 right-4 pointer-events-none glassmorphism p-2 rounded-lg text-xs font-mono border border-dark-border text-cyan-400">
        CAMERA: ORBIT ENABLED
      </div>
    </div>
  );
};

export default SceneContainer;
