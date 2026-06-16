import React from 'react';
import Link from './Link';
import RevoluteJoint from './RevoluteJoint';
import PrismaticJoint from './PrismaticJoint';
import SphericalJoint from './SphericalJoint';
import WorkspaceVisualization from './WorkspaceVisualization';
import { useSimulation } from '../../context/SimulationContext';

interface RobotArmProps {
  // Array of 6 values: [J1_rad, J2_rad, J3_m, J4_rad, J5_rad, J6_rad]
  jointValues: number[];
}

/**
 * RobotArm renders the 6-DOF manipulator assembly.
 * We structure the nested hierarchy to reflect rigid kinematic transforms:
 * Base Plate -> J1 (Revolute Y) -> Link 1 -> J2 (Revolute X) -> Link 2 ->
 * J3 (Prismatic Y) -> Link 3 -> J4/5/6 (Spherical) -> End Effector Gripper
 */
export const RobotArm: React.FC<RobotArmProps> = ({ jointValues }) => {
  const { isWorkspaceVisible } = useSimulation();

  // Unpack joint values safely with fallbacks
  const q1 = jointValues[0] || 0; // J1 Revolute Waist (rad)
  const q2 = jointValues[1] || 0; // J2 Revolute Shoulder (rad)
  const q3 = jointValues[2] || 0; // J3 Prismatic Extension (m)
  const q4 = jointValues[3] || 0; // J4 Spherical Wrist Yaw (rad)
  const q5 = jointValues[4] || 0; // J5 Spherical Wrist Pitch (rad)
  const q6 = jointValues[5] || 0; // J6 Spherical Wrist Roll (rad)

  return (
    <group name="robot_arm_base">
      {/* 3D Workspace boundary representation */}
      <WorkspaceVisualization visible={isWorkspaceVisible} />

      {/* Base Column / Mount Anchor */}
      <Link length={0.15} radius={0.06} axis="y" color="#475569" />

      {/* JOINT 1: Revolute (Waist rotation about Y) */}
      <group position={[0, 0.15, 0]}>
        <RevoluteJoint angle={q1} axis="y" radius={0.06} height={0.06}>
          {/* Link 1: Upper arm pillar */}
          <Link length={0.25} radius={0.05} axis="y" color="#334155" />

          {/* JOINT 2: Revolute (Shoulder pitch about X) */}
          <group position={[0, 0.25, 0]}>
            <RevoluteJoint angle={q2} axis="x" radius={0.05} height={0.08}>
              {/* Link 2: Inner sleeve of telescopic section */}
              <Link length={0.2} radius={0.045} axis="y" color="#475569" />

              {/* JOINT 3: Prismatic (Telescopic extension along Y) */}
              <group position={[0, 0.2, 0]}>
                <PrismaticJoint extension={q3} axis="y" length={0.2} width={0.08}>
                  {/* Link 3: Extended arm section */}
                  <Link length={0.15} radius={0.03} axis="y" color="#64748B" />

                  {/* JOINT 4, 5, 6: Spherical (Wrist roll, pitch, yaw) */}
                  <group position={[0, 0.15, 0]}>
                    <SphericalJoint yaw={q4} pitch={q5} roll={q6} radius={0.04}>
                      {/* Link 4: Gripper neck */}
                      <Link length={0.06} radius={0.02} axis="y" color="#475569" />

                      {/* End-Effector Gripper (Delicate extraction jaws) */}
                      <group position={[0, 0.06, 0]}>
                        {/* Gripper Base */}
                        <mesh castShadow>
                          <boxGeometry args={[0.08, 0.02, 0.03]} />
                          <meshStandardMaterial color="#06B6D4" roughness={0.3} metalness={0.8} />
                        </mesh>
                        
                        {/* Left Finger */}
                        <mesh position={[-0.03, 0.03, 0]} castShadow>
                          <boxGeometry args={[0.015, 0.05, 0.01]} />
                          <meshStandardMaterial color="#1E293B" metalness={0.7} />
                        </mesh>
                        
                        {/* Right Finger */}
                        <mesh position={[0.03, 0.03, 0]} castShadow>
                          <boxGeometry args={[0.015, 0.05, 0.01]} />
                          <meshStandardMaterial color="#1E293B" metalness={0.7} />
                        </mesh>
                      </group>
                    </SphericalJoint>
                  </group>
                </PrismaticJoint>
              </group>
            </RevoluteJoint>
          </group>
        </RevoluteJoint>
      </group>
    </group>
  );
};

export default RobotArm;
