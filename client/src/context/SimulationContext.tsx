import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Vector3D } from '../math/Vector3D';
import { Matrix4x4 } from '../math/Matrix4x4';
import KinematicsSolver from '../math/KinematicsSolver';

export type ControlMode = 'joint' | 'task';

interface SimulationContextType {
  // Poses & Values
  jointValues: number[]; // [J1_rad, J2_rad, J3_m, J4_rad, J5_rad, J6_rad]
  roverPosition: [number, number, number];
  roverRotation: [number, number, number];
  
  // Target Cartesian States (Task Space)
  targetX: number;
  targetY: number;
  targetZ: number;
  targetRoll: number;
  targetPitch: number;
  targetYaw: number;
  
  // Active End Effector Position (computed from current jointValues via FK)
  endEffectorPos: { x: number; y: number; z: number };
  
  // Telemetries & Health
  lidarRange: number;
  batteryVoltage: number;
  temperature: number;
  isRosConnected: boolean;
  isWsConnected: boolean;
  
  // Controls Toggles
  controlMode: ControlMode;
  isWorkspaceVisible: boolean;
  
  // Action Handlers
  setJointValue: (index: number, value: number) => void;
  setTargetCartesian: (x: number, y: number, z: number, r?: number, p?: number, yawVal?: number) => void;
  setControlMode: (mode: ControlMode) => void;
  setIsWorkspaceVisible: (visible: boolean) => void;
  sendDriveCommand: (linear: number, angular: number) => void;
  resetSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Joint Space Configuration
  const [jointValues, setJointValues] = useState<number[]>([0.0, 0.0, 0.0, 0.0, 0.0, 0.0]); // Home
  
  // Mobile chassis state
  const [roverPosition] = useState<[number, number, number]>([0, 0.12, 0]);
  const [roverRotation] = useState<[number, number, number]>([0, 0, 0]);
  
  // Control States
  const [controlMode, setControlModeState] = useState<ControlMode>('joint');
  const [isWorkspaceVisible, setIsWorkspaceVisible] = useState<boolean>(false);

  // Task Space Targets
  // Initial target values matched to default home coordinates:
  // J1=0, J2=0, J3=0, J4=0, J5=0, J6=0 results in tip at: x=0, y=0.15 + 0.25 + 0.20 + 0.15 + 0.06 = 0.81, z=0
  const [targetX, setTargetX] = useState<number>(0.0);
  const [targetY, setTargetY] = useState<number>(0.81);
  const [targetZ, setTargetZ] = useState<number>(0.0);
  const [targetRoll, setTargetRoll] = useState<number>(0.0);
  const [targetPitch, setTargetPitch] = useState<number>(0.0);
  const [targetYaw, setTargetYaw] = useState<number>(0.0);

  // Live Telemetry states
  const [lidarRange, setLidarRange] = useState<number>(2.0);
  const [batteryVoltage, setBatteryVoltage] = useState<number>(24.0);
  const [temperature, setTemperature] = useState<number>(37.0);
  const [isRosConnected, setIsRosConnected] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);

  // Computes active tip coordinates via Forward Kinematics (FK) dynamically
  const endEffectorPos = useMemo(() => {
    const poses = KinematicsSolver.solveFK(jointValues);
    const tipPose = poses[poses.length - 1]; // End-effector tip is the final element
    return {
      x: tipPose.position.x,
      y: tipPose.position.y,
      z: tipPose.position.z
    };
  }, [jointValues]);

  // Set up WebSocket connections
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:5000`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        switch (payload.type) {
          case 'ros_status':
            setIsRosConnected(payload.status === 'connected');
            break;
          case 'sensor_telemetry':
            if (payload.lidarRange !== undefined) setLidarRange(payload.lidarRange);
            if (payload.batteryVoltage !== undefined) setBatteryVoltage(payload.batteryVoltage);
            if (payload.temperatureCelsius !== undefined) setTemperature(payload.temperatureCelsius);
            break;
          case 'joint_telemetry':
            // Only accept remote joint states if we are NOT actively commanding via sliders locally
            if (payload.jointAngles && controlMode === 'joint') {
              setJointValues(payload.jointAngles);
            }
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('[WebSocket] Error parsing socket data:', err);
      }
    };

    ws.onclose = () => {
      setIsWsConnected(false);
      setIsRosConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [controlMode]);

  // Calculate and apply Inverse Kinematics when Target changes in 'task' mode
  useEffect(() => {
    if (controlMode === 'task') {
      const targetPos = new Vector3D(targetX, targetY, targetZ);
      const targetRot = Matrix4x4.rotationY(targetYaw)
        .multiply(Matrix4x4.rotationX(targetPitch))
        .multiply(Matrix4x4.rotationZ(targetRoll));

      const solvedJoints = KinematicsSolver.solveIK(targetPos, targetRot);
      if (solvedJoints) {
        setJointValues(solvedJoints);

        // Transmit coordinates over sockets
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'set_joint_angles',
            jointAngles: solvedJoints,
            timestamp: Date.now()
          }));
        }
      }
    }
  }, [targetX, targetY, targetZ, targetRoll, targetPitch, targetYaw, controlMode]);

  // Command updates: Single joint manual slide
  const setJointValue = useCallback((index: number, value: number) => {
    setJointValues((prev) => {
      const updated = [...prev];
      updated[index] = value;
      
      // Update target coordinate positions to match FK result so switching modes is seamless
      const poses = KinematicsSolver.solveFK(updated);
      const tipPos = poses[poses.length - 1].position;
      setTargetX(tipPos.x);
      setTargetY(tipPos.y);
      setTargetZ(tipPos.z);
      // For orientations, we keep current slider targets in simple scenarios

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: 'set_joint_angles',
          jointAngles: updated,
          timestamp: Date.now()
        }));
      }

      return updated;
    });
  }, []);

  // Modify Target Cartesian points
  const setTargetCartesian = useCallback((x: number, y: number, z: number, r = 0, p = 0, yawVal = 0) => {
    setTargetX(x);
    setTargetY(y);
    setTargetZ(z);
    setTargetRoll(r);
    setTargetPitch(p);
    setTargetYaw(yawVal);
  }, []);

  // Toggle Control mode (synchronize slider state)
  const setControlMode = useCallback((mode: ControlMode) => {
    setControlModeState(mode);
    if (mode === 'task') {
      // Synchronize Target coordinates with active end-effector tip positions
      const poses = KinematicsSolver.solveFK(jointValues);
      const tipPos = poses[poses.length - 1].position;
      setTargetX(tipPos.x);
      setTargetY(tipPos.y);
      setTargetZ(tipPos.z);
    }
  }, [jointValues]);

  // Transmit discrete base motor adjustments
  const sendDriveCommand = useCallback((linear: number, angular: number) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'drive_command',
        linear,
        angular,
        timestamp: Date.now()
      }));
    }
  }, []);

  // Home robot arm
  const resetSimulation = useCallback(() => {
    const homeJoints = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
    setJointValues(homeJoints);
    setControlModeState('joint');
    setTargetX(0.0);
    setTargetY(0.81);
    setTargetZ(0.0);
    setTargetRoll(0.0);
    setTargetPitch(0.0);
    setTargetYaw(0.0);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'set_joint_angles',
        jointAngles: homeJoints,
        timestamp: Date.now()
      }));
    }
  }, []);

  return (
    <SimulationContext.Provider
      value={{
        jointValues,
        roverPosition,
        roverRotation,
        targetX,
        targetY,
        targetZ,
        targetRoll,
        targetPitch,
        targetYaw,
        endEffectorPos,
        lidarRange,
        batteryVoltage,
        temperature,
        isRosConnected,
        isWsConnected,
        controlMode,
        isWorkspaceVisible,
        setJointValue,
        setTargetCartesian,
        setControlMode,
        setIsWorkspaceVisible,
        sendDriveCommand,
        resetSimulation
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
};

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within a SimulationProvider');
  }
  return context;
};
export default SimulationContext;
