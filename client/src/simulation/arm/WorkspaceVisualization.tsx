import React, { useMemo } from 'react';
import KinematicsSolver from '../../math/KinematicsSolver';

interface WorkspaceVisualizationProps {
  visible: boolean;
}

/**
 * WorkspaceVisualization renders a glowing particle cloud mapping the manipulator's reach limits.
 * By using buffer geometries, we render thousands of coordinate points in a single draw call.
 */
export const WorkspaceVisualization: React.FC<WorkspaceVisualizationProps> = ({ visible }) => {
  // Generate the coordinates only once to optimize performance
  const pointsArray = useMemo(() => {
    if (!visible) return new Float32Array(0);

    // Sample the workspace coordinates from the KinematicsSolver
    const sampledPoints = KinematicsSolver.generateWorkspacePoints(10);
    const floatArray = new Float32Array(sampledPoints.length * 3);

    for (let i = 0; i < sampledPoints.length; i++) {
      floatArray[i * 3] = sampledPoints[i].x;
      floatArray[i * 3 + 1] = sampledPoints[i].y;
      floatArray[i * 3 + 2] = sampledPoints[i].z;
    }

    return floatArray;
  }, [visible]);

  if (!visible || pointsArray.length === 0) return null;

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[pointsArray, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#06B6D4"           // Cyan theme
        size={0.025}             // Small dust particle size
        sizeAttenuation={true}  // Fade as camera zoom moves out
        transparent={true}
        opacity={0.35}           // Subtle translucent glow
        depthWrite={false}      // Ignore depth buffer writes to prevent block clipping
      />
    </points>
  );
};

export default WorkspaceVisualization;
