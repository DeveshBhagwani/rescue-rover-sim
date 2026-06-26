import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import { useSimulation } from '../context/SimulationContext';
import { SlamEngine } from '../math/SlamEngine';
import DisasterZone from './environments/DisasterZone';
import RoverBase from './rover/RoverBase';
import RobotArm from './arm/RobotArm';
import Quadcopter from './drone/Quadcopter';

/**
 * SceneContainer sets up the Three.js canvas.
 * It intercept ground clicks to select waypoints and draws planned navigation routes in 3D.
 */
export const SceneContainer: React.FC = () => {
  const { 
    jointValues, 
    roverPosition, 
    roverRotation, 
    navigationPath, 
    slamResolution,
    setNavigationWaypoint,
    dronePosition,
    droneRotation
  } = useSimulation();

  // Convert A* grid waypoints back to 3D world coordinates [X, Y, Z] for rendering
  const pathWorldPoints = useMemo(() => {
    if (!navigationPath || navigationPath.length === 0) return null;
    return navigationPath.map(node => {
      const world = SlamEngine.gridToWorld(node.x, node.y, slamResolution);
      return [world.x, 0.03, world.z] as [number, number, number]; // Elevated slightly above soil
    });
  }, [navigationPath, slamResolution]);

  const handleGroundClick = (e: any) => {
    // Stop propagation so orbit controls doesn't jitter
    e.stopPropagation();
    
    // We only capture clicks on the soil/ground plane (which has name="ground_plane")
    if (e.intersection && e.intersection.point) {
      const { x, z } = e.intersection.point;
      setNavigationWaypoint(x, z);
    }
  };

  return (
    <div className="w-full h-full relative bg-dark-bg">
      <Canvas
        shadows
        camera={{ position: [4, 6, 8], fov: 50 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#090D1A']} />
        <fog attach="fog" args={['#090D1A', 10, 25]} />

        {/* Orbit Camera Controls */}
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2 - 0.05} // Limit tilt
          minDistance={2}
          maxDistance={18}
        />

        {/* Ground grid & procedural obstacles */}
        {/* We attach the click handler to the disaster zone parent group */}
        <group onClick={handleGroundClick}>
          <DisasterZone />
        </group>

        {/* Renders the planned path line in the 3D scene */}
        {pathWorldPoints && pathWorldPoints.length > 1 && (
          <Line
            points={pathWorldPoints}
            color="#A855F7" // Glowing Purple
            lineWidth={3.5}
            dashed={false}
          />
        )}

        {/* Rover Base chassis mounting the Robot Arm */}
        <RoverBase position={roverPosition} rotation={roverRotation}>
          <RobotArm jointValues={jointValues} />
        </RoverBase>

        {/* Quadcopter simulation mesh rendering */}
        <Quadcopter position={dronePosition} rotation={droneRotation} />
      </Canvas>

      {/* Floating 3D Navigation HUD instructions */}
      <div className="absolute bottom-4 right-4 pointer-events-none glassmorphism p-3 rounded-lg text-[10px] font-mono border border-dark-border text-cyan-400 leading-normal">
        <div className="font-bold border-b border-dark-border/40 pb-1 mb-1">AUTONOMOUS DRIVE HELP</div>
        <div>1. Click grid ground to set path waypoint.</div>
        <div>2. Plan path computes route around rubble.</div>
        <div>3. Trigger drive to steer via PID.</div>
      </div>
    </div>
  );
};

export default SceneContainer;
