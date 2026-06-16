import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Vector3D } from '../math/Vector3D';
import { Matrix4x4 } from '../math/Matrix4x4';
import KinematicsSolver from '../math/KinematicsSolver';
import DynamicsSolver from '../math/DynamicsSolver';
import TrajectoryPlanner from '../math/TrajectoryPlanner';

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
  
  // Active End Effector Position (computed via FK)
  endEffectorPos: { x: number; y: number; z: number };
  
  // Dynamics Telemetries
  jointTorques: number[]; // holding loads in N*m
  manipulability: number; // Yoshikawa index
  isTrajectoryActive: boolean;
  isSmoothMode: boolean;
  
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
  setIsSmoothMode: (smooth: boolean) => void;
  triggerTrajectory: () => void;
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
  const [isSmoothMode, setIsSmoothModeState] = useState<boolean>(true);

  // Dynamics Telemetries
  const [jointTorques, setJointTorques] = useState<number[]>([0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
  const [manipulability, setManipulability] = useState<number>(1.0);
  const [isTrajectoryActive, setIsTrajectoryActive] = useState<boolean>(false);

  // Task Space Targets
  const [targetX, setTargetX] = useState<number>(0.0);
  const [targetY, setTargetY] = useState<number>(0.81);
  const [targetZ, setTargetZ] = useState<number>(0.0);
  const [targetRoll, setTargetRoll] = useState<number>(0.0);
  const [targetPitch, setTargetPitch] = useState<number>(0.0);
  const [targetYaw, setTargetYaw] = useState<number>(0.0);

  // Trajectory references
  const startJointsRef = useRef<number[]>([0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
  const targetJointsRef = useRef<number[]>([0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);
  const startTimeRef = useRef<number>(0);
  const trajectoryDuration = 1.2; // seconds

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
            if (payload.jointAngles && controlMode === 'joint' && !isTrajectoryActive) {
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
  }, [controlMode, isTrajectoryActive]);

  // Dynamics Update Loop: calculates gravity torques and singular indices on Q adjustments
  useEffect(() => {
    const torques = DynamicsSolver.computeGravityTorques(jointValues);
    setJointTorques(torques);

    const measure = DynamicsSolver.calculateManipulability(jointValues);
    setManipulability(measure);
  }, [jointValues]);

  // Smooth Interpolation Frame Loop
  useEffect(() => {
    if (!isTrajectoryActive) return;

    let animFrameId: number;

    const tick = (timestamp: number) => {
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) / 1000; // in seconds

      if (elapsed >= trajectoryDuration) {
        // Complete trajectory, snap to target configurations
        setJointValues(targetJointsRef.current);
        setIsTrajectoryActive(false);
        startTimeRef.current = 0;

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'set_joint_angles',
            jointAngles: targetJointsRef.current,
            timestamp: Date.now()
          }));
        }
      } else {
        // Compute interpolated position at current time step
        const path = TrajectoryPlanner.interpolateJoints(
          startJointsRef.current,
          targetJointsRef.current,
          trajectoryDuration,
          elapsed
        );
        setJointValues(path.positions);

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'set_joint_angles',
            jointAngles: path.positions,
            timestamp: Date.now()
          }));
        }

        animFrameId = requestAnimationFrame(tick);
      }
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [isTrajectoryActive]);

  // Trigger smooth quintic trajectory transition helper
  const startTrajectory = useCallback((targetJoints: number[]) => {
    startJointsRef.current = [...jointValues];
    targetJointsRef.current = targetJoints;
    startTimeRef.current = 0;
    setIsTrajectoryActive(true);
  }, [jointValues]);

  // Command updates: Single joint manual slide
  const setJointValue = useCallback((index: number, value: number) => {
    // If a trajectory is active, we terminate it to allow user manual override
    setIsTrajectoryActive(false);
    
    setJointValues((prev) => {
      const updated = [...prev];
      updated[index] = value;
      
      // Update target coordinate positions to match FK result so switching modes is seamless
      const poses = KinematicsSolver.solveFK(updated);
      const tipPos = poses[poses.length - 1].position;
      setTargetX(tipPos.x);
      setTargetY(tipPos.y);
      setTargetZ(tipPos.z);

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

  // Trigger trajectory manually using current targets
  const triggerTrajectory = useCallback(() => {
    const targetPos = new Vector3D(targetX, targetY, targetZ);
    const targetRot = Matrix4x4.rotationY(targetYaw)
      .multiply(Matrix4x4.rotationX(targetPitch))
      .multiply(Matrix4x4.rotationZ(targetRoll));

    const solvedJoints = KinematicsSolver.solveIK(targetPos, targetRot);
    if (solvedJoints) {
      startTrajectory(solvedJoints);
    }
  }, [targetX, targetY, targetZ, targetRoll, targetPitch, targetYaw, startTrajectory]);

  // Toggle Control mode (synchronize slider state)
  const setControlMode = useCallback((mode: ControlMode) => {
    setControlModeState(mode);
    setIsTrajectoryActive(false); // Reset active movements
    if (mode === 'task') {
      const poses = KinematicsSolver.solveFK(jointValues);
      const tipPos = poses[poses.length - 1].position;
      setTargetX(tipPos.x);
      setTargetY(tipPos.y);
      setTargetZ(tipPos.z);
    }
  }, [jointValues]);

  // Set trajectory interpolation toggle
  const setIsSmoothMode = useCallback((smooth: boolean) => {
    setIsSmoothModeState(smooth);
  }, []);

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
    setIsTrajectoryActive(false);
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
        jointTorques,
        manipulability,
        isTrajectoryActive,
        isSmoothMode,
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
        setIsSmoothMode,
        triggerTrajectory,
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
