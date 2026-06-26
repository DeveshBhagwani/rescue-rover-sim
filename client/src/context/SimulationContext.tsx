import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Vector3D } from '../math/Vector3D';
import { Matrix4x4 } from '../math/Matrix4x4';
import KinematicsSolver from '../math/KinematicsSolver';
import DynamicsSolver from '../math/DynamicsSolver';
import TrajectoryPlanner from '../math/TrajectoryPlanner';
import { PathPlanner } from '../math/PathPlanner';
import type { GridPos } from '../math/PathPlanner';
import { SlamEngine } from '../math/SlamEngine';
import type { ObstacleData } from '../math/SlamEngine';
import { PidController } from '../math/PidController';
import CollisionDetector from '../math/CollisionDetector';
import SensorFusion from '../math/SensorFusion';

export type ControlMode = 'joint' | 'task';

interface SimulationContextType {
  // Poses & Values
  jointValues: number[]; // [J1_rad, J2_rad, J3_m, J4_rad, J5_rad, J6_rad]
  roverPosition: [number, number, number]; // [x, y, z] in meters
  roverRotation: [number, number, number]; // [roll, pitch, yaw] in radians
  roverHeading: number; // yaw angle in radians
  
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
  jointTorques: number[];
  manipulability: number;
  isTrajectoryActive: boolean;
  isSmoothMode: boolean;
  
  // Navigation & Mapping States
  slamGrid: number[];
  slamWidth: number;
  slamHeight: number;
  slamResolution: number;
  navigationPath: GridPos[] | null;
  targetWaypoint: { x: number; z: number } | null;
  isAutonomousDriving: boolean;
  
  // Pathfinder & Sandbox
  pathfinderAlgorithm: string;
  setPathfinderAlgorithm: (algo: string) => void;
  activeObstacles: ObstacleData[];
  setActiveObstacles: React.Dispatch<React.SetStateAction<ObstacleData[]>>;
  defaultObstacles: ObstacleData[];

  // Drone States
  dronePosition: [number, number, number];
  droneRotation: [number, number, number];

  // Chaos Mode Fault Injection
  chaosSensorNoise: boolean;
  setChaosSensorNoise: (val: boolean) => void;
  chaosPacketLoss: boolean;
  setChaosPacketLoss: (val: boolean) => void;
  chaosActuatorFreeze: boolean;
  setChaosActuatorFreeze: (val: boolean) => void;
  chaosFrozenJointIndex: number;
  setChaosFrozenJointIndex: (val: number) => void;
  chaosFrozenJointAngle: number;
  setChaosFrozenJointAngle: (val: number) => void;
  chaosBatteryDrop: boolean;
  setChaosBatteryDrop: (val: boolean) => void;

  // PID Gains
  Kp_steer: number;
  Kd_steer: number;
  Kp_dist: number;
  setKpSteer: (val: number) => void;
  setKdSteer: (val: number) => void;
  setKpDist: (val: number) => void;
  
  // Telemetries & Health
  lidarRange: number;
  batteryVoltage: number;
  temperature: number;
  isRosConnected: boolean;
  isWsConnected: boolean;
  
  // Controls Toggles
  controlMode: ControlMode;
  isWorkspaceVisible: boolean;
  
  // Calibration & Offsets
  jointOffsets: number[];
  saveCalibrationOffsets: (offsets: number[]) => Promise<void>;

  // Perception & Sensor Fusion
  fusedTargetPos: [number, number, number];
  rawCameraPos: [number, number, number];
  rawLidarPos: [number, number, number];
  isEStopped: boolean;
  resetEStop: () => void;
  armCollisionWarning: boolean;
  isGrasping: boolean;
  setIsGrasping: (val: boolean) => void;
  graspingForce: number;

  // Action Handlers
  setJointValue: (index: number, value: number) => void;
  setTargetCartesian: (x: number, y: number, z: number, r?: number, p?: number, yawVal?: number) => void;
  setControlMode: (mode: ControlMode) => void;
  setIsWorkspaceVisible: (visible: boolean) => void;
  setIsSmoothMode: (smooth: boolean) => void;
  triggerTrajectory: () => void;
  setNavigationWaypoint: (x: number, z: number) => void;
  setIsAutonomousDriving: (active: boolean) => void;
  sendDriveCommand: (linear: number, angular: number) => void;
  resetSimulation: () => void;

  // Replay Mission Analytics
  isReplayMode: boolean;
  replayFrames: any[];
  replayIndex: number;
  replayMissionId: string;
  setReplayMode: (active: boolean) => void;
  loadReplaySession: (missionId: string) => Promise<void>;
  setReplayIndex: (index: number) => void;
  startNewMission: () => void;
  currentMissionId: string;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Joint Space Configuration
  const [jointValues, setJointValues] = useState<number[]>([0.0, 0.0, 0.0, 0.0, 0.0, 0.0]); // Home

  // Calibration preset offsets
  const [jointOffsets, setJointOffsets] = useState<number[]>([0.0, 0.0, 0.0, 0.0, 0.0, 0.0]);

  // Replay Mission Analytics states
  const [isReplayMode, setIsReplayModeState] = useState<boolean>(false);
  const isReplayModeRef = useRef<boolean>(false);
  const [replayFrames, setReplayFrames] = useState<any[]>([]);
  const [replayIndex, setReplayIndexState] = useState<number>(0);
  const [replayMissionId, setReplayMissionId] = useState<string>('');
  const [currentMissionId, setCurrentMissionId] = useState<string>(`mission_${Date.now()}`);
  const currentMissionIdRef = useRef<string>(currentMissionId);

  // Backup states to restore after leaving replay mode
  const backupStates = useRef<{
    jointValues: number[];
    roverPosition: [number, number, number];
    roverHeading: number;
    lidarRange: number;
    batteryVoltage: number;
    temperature: number;
    jointTorques: number[];
    manipulability: number;
  } | null>(null);

  useEffect(() => {
    currentMissionIdRef.current = currentMissionId;
  }, [currentMissionId]);

  // Perception / Sensor Fusion / Safety States
  const [fusedTargetPos, setFusedTargetPos] = useState<[number, number, number]>([-1.0, 0.5, 1.0]);
  const [rawCameraPos, setRawCameraPos] = useState<[number, number, number]>([-1.0, 0.5, 1.0]);
  const [rawLidarPos, setRawLidarPos] = useState<[number, number, number]>([-1.0, 0.5, 1.0]);
  const [isEStopped, setIsEStopped] = useState<boolean>(false);
  const [armCollisionWarning, setArmCollisionWarning] = useState<boolean>(false);
  const [isGrasping, setIsGrasping] = useState<boolean>(false);
  const [graspingForce, setGraspingForce] = useState<number>(0.0);

  // Sensor Fusion Kalman Filter Instantiation
  const sensorFusion = useRef(new SensorFusion(new Vector3D(-1.0, 0.5, 1.0)));
  
  // Mobile chassis state
  const [roverPosition, setRoverPosition] = useState<[number, number, number]>([0, 0.12, 0]);
  const [roverHeading, setRoverHeading] = useState<number>(0.0); // Heading in radians
  const roverRotation = useMemo((): [number, number, number] => [0, roverHeading, 0], [roverHeading]);
  
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

  // Navigation & Mapping Configurations
  const slamWidth = 60;
  const slamHeight = 60;
  const slamResolution = 0.5;
  const [slamGrid, setSlamGrid] = useState<number[]>(() => Array(3600).fill(-1)); // -1: Unexplored
  const [navigationPath, setNavigationPath] = useState<GridPos[] | null>(null);
  const [targetWaypoint, setTargetWaypoint] = useState<{ x: number; z: number } | null>(null);
  const [isAutonomousDriving, setIsAutonomousDriving] = useState<boolean>(false);

  // Dynamic PID Gain parameters
  const [Kp_steer, setKpSteer] = useState<number>(1.8);
  const [Kd_steer, setKdSteer] = useState<number>(0.2);
  const [Kp_dist, setKpDist] = useState<number>(1.2);

  // Pathfinder Sandbox Algorithm
  const [pathfinderAlgorithm, setPathfinderAlgorithmState] = useState<string>('astar');
  
  const setPathfinderAlgorithm = useCallback((algo: string) => {
    setPathfinderAlgorithmState(algo);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'set_algorithm',
        algorithm: algo,
        timestamp: Date.now()
      }));
    }
  }, []);

  // Chaos Mode States
  const [chaosSensorNoise, setChaosSensorNoise] = useState<boolean>(false);
  const [chaosPacketLoss, setChaosPacketLoss] = useState<boolean>(false);
  const [chaosActuatorFreeze, setChaosActuatorFreeze] = useState<boolean>(false);
  const [chaosFrozenJointIndex, setChaosFrozenJointIndex] = useState<number>(1);
  const [chaosFrozenJointAngle, setChaosFrozenJointAngle] = useState<number>(0.3);
  const [chaosBatteryDrop, setChaosBatteryDrop] = useState<boolean>(false);

  // Drone states
  const [dronePosition, setDronePosition] = useState<[number, number, number]>([0.0, 8.0, 0.0]);
  const [droneRotation, setDroneRotation] = useState<[number, number, number]>([0.0, 0.0, 0.0]);

  // Collaborative SLAM grids cache
  const roverSlamGridRef = useRef<number[]>(Array(3600).fill(-1));
  const droneSlamGridRef = useRef<number[]>(Array(3600).fill(-1));

  // Static Rubble coordinate positions matching Rubbles.tsx exactly
  const defaultObstacles = useMemo((): ObstacleData[] => [
    { x: -3, z: 3, radius: 0.9 },
    { x: 3, z: -3, radius: 1.1 },
    { x: -2, z: -4, radius: 0.7 },
    { x: 4, z: 2, radius: 0.8 },
    { x: 0, z: 5, radius: 1.3 },
    { x: -5, z: 0, radius: 0.7 },
    { x: 5, z: 5, radius: 0.8 },
    { x: 1.5, z: 2.5, radius: 0.6 },
    { x: -1.5, z: 1.5, radius: 0.6 }
  ], []);

  const [activeObstacles, setActiveObstacles] = useState<ObstacleData[]>(defaultObstacles);

  // PID Steer and Speed controller blocks
  const steerPID = useRef(new PidController(1.8, 0.01, 0.2, -1.2, 1.2)); // steering velocity clamp
  const distPID = useRef(new PidController(1.2, 0.0, 0.1, -0.6, 0.6)); // linear velocity clamp

  // Dynamically update controller gains
  useEffect(() => {
    steerPID.current.setGains(Kp_steer, 0.01, Kd_steer);
  }, [Kp_steer, Kd_steer]);

  useEffect(() => {
    distPID.current.setGains(Kp_dist, 0.0, 0.05);
  }, [Kp_dist]);

  // Live Telemetry states
  const [lidarRange, setLidarRange] = useState<number>(2.0);
  const [batteryVoltage, setBatteryVoltage] = useState<number>(24.0);
  const [temperature, setTemperature] = useState<number>(37.0);
  const [isRosConnected, setIsRosConnected] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  // Replay Mission Analytics action handlers
  const setReplayMode = useCallback((active: boolean) => {
    setIsReplayModeState(active);
    isReplayModeRef.current = active;
    
    if (active) {
      // Pause autonomous driving
      setIsAutonomousDriving(false);
      
      // Backup current live states
      backupStates.current = {
        jointValues: [...jointValues],
        roverPosition: [...roverPosition],
        roverHeading,
        lidarRange,
        batteryVoltage,
        temperature,
        jointTorques: [...jointTorques],
        manipulability
      };
    } else {
      // Restore live states
      if (backupStates.current) {
        setJointValues(backupStates.current.jointValues);
        setRoverPosition(backupStates.current.roverPosition);
        setRoverHeading(backupStates.current.roverHeading);
        setLidarRange(backupStates.current.lidarRange);
        setBatteryVoltage(backupStates.current.batteryVoltage);
        setTemperature(backupStates.current.temperature);
        setJointTorques(backupStates.current.jointTorques);
        setManipulability(backupStates.current.manipulability);
      }
      setReplayFrames([]);
      setReplayIndexState(0);
      setReplayMissionId('');
    }
  }, [jointValues, roverPosition, roverHeading, lidarRange, batteryVoltage, temperature, jointTorques, manipulability]);

  const loadReplaySession = useCallback(async (missionId: string) => {
    try {
      const response = await fetch(`/api/replay/session/${missionId}`);
      if (!response.ok) throw new Error('Failed to load session');
      const data = await response.json();
      if (data && data.length > 0) {
        setReplayFrames(data);
        setReplayMissionId(missionId);
        setReplayIndexState(0);
        // Load the first frame immediately
        const frame = data[0];
        setJointValues(frame.jointValues);
        setRoverPosition([frame.odometry.x, frame.odometry.y, frame.odometry.z]);
        setRoverHeading(frame.odometry.heading);
        if (frame.jointTorques) setJointTorques(frame.jointTorques);
        if (frame.manipulability !== undefined) setManipulability(frame.manipulability);
        if (frame.battery !== undefined) setBatteryVoltage(frame.battery);
        if (frame.temp !== undefined) setTemperature(frame.temp);
        if (frame.lidar !== undefined) setLidarRange(frame.lidar);
      }
    } catch (error) {
      console.error('[Replay] Error loading session:', error);
      alert('Error loading historical mission session.');
    }
  }, []);

  const setReplayIndex = useCallback((idx: number) => {
    if (idx < 0 || idx >= replayFrames.length) return;
    setReplayIndexState(idx);
    
    const frame = replayFrames[idx];
    setJointValues(frame.jointValues);
    setRoverPosition([frame.odometry.x, frame.odometry.y, frame.odometry.z]);
    setRoverHeading(frame.odometry.heading);
    if (frame.jointTorques) setJointTorques(frame.jointTorques);
    if (frame.manipulability !== undefined) setManipulability(frame.manipulability);
    if (frame.battery !== undefined) setBatteryVoltage(frame.battery);
    if (frame.temp !== undefined) setTemperature(frame.temp);
    if (frame.lidar !== undefined) setLidarRange(frame.lidar);
  }, [replayFrames]);

  const startNewMission = useCallback(() => {
    const newId = `mission_${Date.now()}`;
    setCurrentMissionId(newId);
    currentMissionIdRef.current = newId;
    console.log('[Mission] Started new telemetry recording mission session:', newId);
  }, []);

  // Periodic high-frequency telemetry logging over WebSockets
  useEffect(() => {
    const logInterval = setInterval(() => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && !isReplayModeRef.current) {
        // Drop outgoing telemetry packet to mock packet loss
        if (chaosPacketLoss && Math.random() < 0.35) {
          return;
        }
        // Collect PID tracking errors
        const steerErr = isAutonomousDriving ? steerPID.current.getLastError() : 0.0;
        const distErr = isAutonomousDriving ? distPID.current.getLastError() : 0.0;

        const payload = {
          type: 'simulation_telemetry',
          missionId: currentMissionIdRef.current,
          jointValues,
          jointTorques,
          pidErrors: {
            steer: steerErr,
            distance: distErr
          },
          odometry: {
            x: roverPosition[0],
            y: roverPosition[1],
            z: roverPosition[2],
            heading: roverHeading
          },
          manipulability,
          battery: batteryVoltage,
          temp: temperature,
          lidar: lidarRange,
          timestamp: Date.now()
        };

        socketRef.current.send(JSON.stringify(payload));
      }
    }, 200); // 5Hz high-frequency logging rate

    return () => clearInterval(logInterval);
  }, [jointValues, jointTorques, roverPosition, roverHeading, manipulability, batteryVoltage, temperature, lidarRange, isAutonomousDriving]);

  const socketRef = useRef<WebSocket | null>(null);

  // Computes active tip coordinates via Forward Kinematics (FK) dynamically, applying calibration offsets
  const endEffectorPos = useMemo(() => {
    const calibrated = jointValues.map((val, idx) => val + (jointOffsets[idx] || 0));
    const poses = KinematicsSolver.solveFK(calibrated);
    const tipPose = poses[poses.length - 1];
    return {
      x: tipPose.position.x,
      y: tipPose.position.y,
      z: tipPose.position.z
    };
  }, [jointValues, jointOffsets]);

  // Set up WebSocket connections
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:5000`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsWsConnected(true);
    };

    ws.onmessage = (event) => {
      // Drop incoming telemetry packet to mock packet loss
      if (chaosPacketLoss && Math.random() < 0.35) {
        return;
      }
      try {
        const payload = JSON.parse(event.data);
        switch (payload.type) {
          case 'ros_status':
            setIsRosConnected(payload.status === 'connected');
            break;
          case 'sensor_telemetry':
            if (isReplayModeRef.current) break;
            if (payload.lidarRange !== undefined) setLidarRange(payload.lidarRange);
            if (payload.batteryVoltage !== undefined) setBatteryVoltage(payload.batteryVoltage);
            if (payload.temperatureCelsius !== undefined) setTemperature(payload.temperatureCelsius);
            break;
          case 'joint_telemetry':
            if (isReplayModeRef.current) break;
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
  }, [controlMode, isTrajectoryActive, chaosPacketLoss]);

  // Sync chaos states to backend and ROS2 node bridge
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'chaos_config',
        sensor_noise: chaosSensorNoise,
        packet_loss: chaosPacketLoss,
        actuator_freeze: chaosActuatorFreeze,
        timestamp: Date.now()
      }));
    }
  }, [chaosSensorNoise, chaosPacketLoss, chaosActuatorFreeze]);

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

      const elapsed = (timestamp - startTimeRef.current) / 1000;

      if (elapsed >= trajectoryDuration) {
        let finalJoints = [...targetJointsRef.current];
        if (chaosActuatorFreeze) {
          finalJoints[chaosFrozenJointIndex] = chaosFrozenJointAngle;
        }
        setJointValues(finalJoints);
        setIsTrajectoryActive(false);
        startTimeRef.current = 0;

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'set_joint_angles',
            jointAngles: finalJoints,
            timestamp: Date.now()
          }));
        }
      } else {
        const path = TrajectoryPlanner.interpolateJoints(
          startJointsRef.current,
          targetJointsRef.current,
          trajectoryDuration,
          elapsed
        );
        let pathJoints = [...path.positions];
        if (chaosActuatorFreeze) {
          pathJoints[chaosFrozenJointIndex] = chaosFrozenJointAngle;
        }
        setJointValues(pathJoints);

        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            type: 'set_joint_angles',
            jointAngles: pathJoints,
            timestamp: Date.now()
          }));
        }

        animFrameId = requestAnimationFrame(tick);
      }
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [isTrajectoryActive]);

  // Load saved calibration presets on mount from Express/MongoDB
  useEffect(() => {
    fetch('/api/calibration/RescueRover_01')
      .then((res) => {
        if (!res.ok) throw new Error('Calibration preset unavailable');
        return res.json();
      })
      .then((data) => {
        if (data && data.jointOffsets) {
          setJointOffsets(data.jointOffsets);
          console.log('[Calibration] Loaded presets from DB:', data.jointOffsets);
        }
      })
      .catch((err) => console.warn('[Calibration] Preset load bypassed, using defaults:', err.message));
  }, []);

  // Save calibration presets to Express/MongoDB backend API
  const saveCalibrationOffsets = useCallback(async (offsets: number[]) => {
    try {
      const response = await fetch('/api/calibration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          robotName: 'RescueRover_01',
          jointOffsets: offsets,
          wheelBaseWidth: 0.55,
          wheelRadius: 0.12,
          cameraOffset: {
            position: { x: 0.1, y: 0.0, z: 0.4 },
            rotation: { roll: 0.0, pitch: 0.0, yaw: 0.0 }
          }
        }),
      });
      if (!response.ok) throw new Error('Failed to post calibration data');
      const data = await response.json();
      if (data && data.jointOffsets) {
        setJointOffsets(data.jointOffsets);
        console.log('[Calibration] Presets saved to MongoDB successfully:', data.jointOffsets);
      }
    } catch (err) {
      console.error('[Calibration] Error saving preset settings:', err);
      throw err;
    }
  }, []);

  // Gripper and end-effector proximity checks
  useEffect(() => {
    const h = roverHeading;
    // Compute current end effector tip world coordinates (using calibrated joints)
    const eeXWorld = roverPosition[0] + endEffectorPos.x * Math.cos(h) + endEffectorPos.z * Math.sin(h);
    const eeYWorld = roverPosition[1] + endEffectorPos.y;
    const eeZWorld = roverPosition[2] - endEffectorPos.x * Math.sin(h) + endEffectorPos.z * Math.cos(h);
    const eeWorldPos = new Vector3D(eeXWorld, eeYWorld, eeZWorld);

    // Check manipulator tip collision warning threshold (0.05m)
    const isArmInColl = CollisionDetector.checkArmCollision(eeWorldPos, activeObstacles, 0.05);
    setArmCollisionWarning(isArmInColl);

    // Squeeze / Grasp contact force simulation based on target canister proximity
    const targetWorld = new Vector3D(-1.5, 0.7, 1.5);
    const dx = eeXWorld - targetWorld.x;
    const dy = eeYWorld - targetWorld.y;
    const dz = eeZWorld - targetWorld.z;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (isGrasping && distanceToTarget < 0.08) {
      // Linear spring contact model: F_grasp = K_spring * (0.08 - distance)
      const force = 150.0 * (0.08 - distanceToTarget);
      setGraspingForce(force);
    } else {
      setGraspingForce(0.0);
    }
  }, [endEffectorPos, roverPosition, roverHeading, isGrasping, activeObstacles]);

  // Central Rover Sim Update Tick: Handles SLAM mapping, safety checks, and PID waypoints controls
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (timestamp: number) => {
      const dt = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      // Drain battery dynamically if battery fault is active
      if (chaosBatteryDrop) {
        setBatteryVoltage((prev) => Math.max(0, prev - dt * 0.45));
      }

      // 1. Run Collaborative SLAM calculations: update ground SLAM cache
      roverSlamGridRef.current = SlamEngine.updateSLAM(
        roverSlamGridRef.current,
        slamWidth,
        slamHeight,
        slamResolution,
        roverPosition[0],
        roverPosition[2],
        activeObstacles
      );

      // 2. Simulate overhead flight path coordinates
      const t = timestamp / 1000;
      const droneX = Math.sin(t * 0.25) * 11.5;
      const droneZ = Math.cos(t * 0.125) * 11.5;
      const droneY = 7.5 + Math.sin(t * 0.5) * 0.5;
      const dronePos: [number, number, number] = [droneX, droneY, droneZ];
      setDronePosition(dronePos);

      // Calculate roll/pitch bank angles based on speed derivatives
      const droneVx = 0.25 * Math.cos(t * 0.25) * 11.5;
      const droneVz = -0.125 * Math.sin(t * 0.125) * 11.5;
      const rollAngle = -droneVx * 0.05;
      const pitchAngle = droneVz * 0.05;
      const yawAngle = Math.atan2(droneVx, droneVz);
      setDroneRotation([rollAngle, pitchAngle, yawAngle]);

      // 3. Update overhead aerial SLAM cache
      droneSlamGridRef.current = SlamEngine.updateAerialSLAM(
        droneSlamGridRef.current,
        slamWidth,
        slamHeight,
        slamResolution,
        droneX,
        droneZ,
        droneY,
        activeObstacles
      );

      // 4. Fuse Ground and Aerial occupancy grids into a unified costmap
      setSlamGrid(SlamEngine.fuseMaps(roverSlamGridRef.current, droneSlamGridRef.current));

      // 2. Perform base proximity safety check to trigger E-stop
      const baseColl = CollisionDetector.checkBaseCollision(
        roverPosition[0],
        roverPosition[2],
        activeObstacles,
        0.35,
        0.25 // safety threshold = chassisRadius + safetyMargin = 0.6m
      );

      if (baseColl) {
        setIsEStopped(true);
        setIsAutonomousDriving(false);
      }

      // 3. Sensor Fusion updates: simulates raw noisy camera and lidar readings
      const TRUE_TARGET_POS = new Vector3D(-1.5, 0.7, 1.5);
      
      // Camera measurement has higher angular noise: stdDev of 0.20m
      const camNoiseVal = () => (Math.random() - 0.5) * 0.4;
      const camMeas = new Vector3D(
        TRUE_TARGET_POS.x + camNoiseVal(),
        TRUE_TARGET_POS.y + camNoiseVal(),
        TRUE_TARGET_POS.z + camNoiseVal()
      );

      // Lidar measurement has lower range noise: stdDev of 0.03m
      const lidNoiseVal = () => (Math.random() - 0.5) * 0.06;
      const lidMeas = new Vector3D(
        TRUE_TARGET_POS.x + lidNoiseVal(),
        TRUE_TARGET_POS.y + lidNoiseVal(),
        TRUE_TARGET_POS.z + lidNoiseVal()
      );

      setRawCameraPos([camMeas.x, camMeas.y, camMeas.z]);
      setRawLidarPos([lidMeas.x, lidMeas.y, lidMeas.z]);

      sensorFusion.current.predict();
      sensorFusion.current.update(camMeas, false); // Camera bearing update
      const fused = sensorFusion.current.update(lidMeas, true); // Lidar distance update

      setFusedTargetPos([fused.x, fused.y, fused.z]);

      // 4. Run closed-loop navigation PID steering
      if (isAutonomousDriving && navigationPath && navigationPath.length > 0) {
        const targetNode = navigationPath[0]; // next waypoint node
        const targetWorld = SlamEngine.gridToWorld(targetNode.x, targetNode.y, slamResolution);

        const dx = targetWorld.x - roverPosition[0];
        const dz = targetWorld.z - roverPosition[2];
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.20) {
          // Waypoint reached, pop and advance to next node
          setNavigationPath((prevPath) => {
            if (!prevPath || prevPath.length <= 1) {
              setIsAutonomousDriving(false);
              setTargetWaypoint(null);
              return null;
            }
            return prevPath.slice(1);
          });
          steerPID.current.reset();
          distPID.current.reset();
        } else {
          // Steer calculation: heading error normalized to [-pi, pi]
          const targetHeading = Math.atan2(dx, dz);
          let headingError = targetHeading - roverHeading;
          while (headingError > Math.PI) headingError -= 2 * Math.PI;
          while (headingError < -Math.PI) headingError += 2 * Math.PI;

          const omega = steerPID.current.calculate(headingError, dt);
          
          // Speed calculation: slow down during sharp alignments, or force 0 if E-stopped
          const targetSpeed = Math.abs(headingError) > 0.4 
            ? 0.05 
            : distPID.current.calculate(dist, dt);

          // Battery depletion triggers brownout safety shutdown or speed throttle
          const isBatteryDepleted = batteryVoltage < 18.5;
          const speedScale = isBatteryDepleted ? 0.35 : 1.0;
          const v = (isEStopped || baseColl || batteryVoltage <= 15.0) ? 0.0 : targetSpeed * speedScale;

          // Update odometry coordinates, injecting drift noise if Sensor Noise is enabled
          const headingJitter = chaosSensorNoise ? (Math.random() - 0.5) * 0.03 : 0.0;
          const posJitterX = chaosSensorNoise ? (Math.random() - 0.5) * 0.06 : 0.0;
          const posJitterZ = chaosSensorNoise ? (Math.random() - 0.5) * 0.06 : 0.0;

          const newHeading = roverHeading + omega * dt + headingJitter;
          const newX = roverPosition[0] + v * Math.sin(roverHeading) * dt + posJitterX;
          const newZ = roverPosition[2] + v * Math.cos(roverHeading) * dt + posJitterZ;

          setRoverHeading(newHeading);
          setRoverPosition([newX, 0.12, newZ]);

          // Transmit telemetry
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: 'base_telemetry',
              x: newX,
              z: newZ,
              heading: newHeading,
              linearVelocity: v,
              angularVelocity: omega,
              timestamp: Date.now()
            }));
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isAutonomousDriving, navigationPath, roverPosition, roverHeading, activeObstacles, isEStopped, chaosSensorNoise, chaosBatteryDrop, batteryVoltage]);

  // Set navigation destination, trigger chosen routing calculations
  const setNavigationWaypoint = useCallback((x: number, z: number) => {
    setTargetWaypoint({ x, z });

    // Identify start/end coordinates in the grid map
    const startGrid = SlamEngine.worldToGrid(roverPosition[0], roverPosition[2], slamWidth, slamHeight, slamResolution);
    const goalGrid = SlamEngine.worldToGrid(x, z, slamWidth, slamHeight, slamResolution);

    // Compute route using chosen pathfinder search on the live SLAM occupancy map
    const result = PathPlanner.planPath(pathfinderAlgorithm, slamGrid, slamWidth, slamHeight, startGrid, goalGrid);
    const path = result.path;
    if (path) {
      setNavigationPath(path);
      setIsAutonomousDriving(true); // Initiate self-drive instantly
      steerPID.current.reset();
      distPID.current.reset();
    } else {
      console.warn('[Navigation] Route blocked or unreachable.');
      setNavigationPath(null);
      setIsAutonomousDriving(false);
    }
  }, [roverPosition, slamGrid, pathfinderAlgorithm]);

  // Trigger smooth quintic trajectory transition helper
  const startTrajectory = useCallback((targetJoints: number[]) => {
    startJointsRef.current = [...jointValues];
    targetJointsRef.current = targetJoints;
    startTimeRef.current = 0;
    setIsTrajectoryActive(true);
  }, [jointValues]);

  // Command updates: Single joint manual slide
  const setJointValue = useCallback((index: number, value: number) => {
    setIsTrajectoryActive(false);
    setJointValues((prev) => {
      const updated = [...prev];
      if (chaosActuatorFreeze && index === chaosFrozenJointIndex) {
        updated[index] = chaosFrozenJointAngle;
      } else {
        updated[index] = value;
      }
      
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
  }, [chaosActuatorFreeze, chaosFrozenJointIndex, chaosFrozenJointAngle]);

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
      if (chaosActuatorFreeze) {
        solvedJoints[chaosFrozenJointIndex] = chaosFrozenJointAngle;
      }
      startTrajectory(solvedJoints);
    }
  }, [targetX, targetY, targetZ, targetRoll, targetPitch, targetYaw, startTrajectory, chaosActuatorFreeze, chaosFrozenJointIndex, chaosFrozenJointAngle]);

  // Toggle Control mode
  const setControlMode = useCallback((mode: ControlMode) => {
    setControlModeState(mode);
    setIsTrajectoryActive(false);
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
    // If E-stopped, block forward/backward linear driving command
    if (isEStopped && linear !== 0) {
      console.warn('[Safety] Driving blocked under E-STOP. Clear obstacles or reset simulation.');
      return;
    }

    // Manually overriding disables autonomous drive steering
    setIsAutonomousDriving(false);
    setTargetWaypoint(null);
    setNavigationPath(null);

    // Integrates velocity command into pose directly for local keyboard control
    const dt = 0.1; // 100ms approximation
    setRoverPosition((prev) => {
      const heading = roverHeading;
      const newX = prev[0] + linear * Math.sin(heading) * dt;
      const newZ = prev[2] + linear * Math.cos(heading) * dt;
      return [newX, prev[1], newZ];
    });
    setRoverHeading((prev) => prev + angular * dt);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'drive_command',
        linear,
        angular,
        timestamp: Date.now()
      }));
    }
  }, [roverHeading, isEStopped]);

  // Method to manually release/reset E-stop condition
  const resetEStop = useCallback(() => {
    setIsEStopped(false);
    console.log('[Safety] E-Stop manually cleared.');
  }, []);

  // Home robot arm & resets rover positions
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

    // Reset safety, grasping and sensor fusion
    setIsEStopped(false);
    setIsGrasping(false);
    setGraspingForce(0.0);
    setArmCollisionWarning(false);
    sensorFusion.current.reset(new Vector3D(-1.0, 0.5, 1.0));

    // Reset base navigation
    setRoverPosition([0, 0.12, 0]);
    setRoverHeading(0.0);
    setNavigationPath(null);
    setTargetWaypoint(null);
    setIsAutonomousDriving(false);
    setSlamGrid(Array(3600).fill(-1)); // Clear SLAM map
    setActiveObstacles(defaultObstacles); // Reset obstacles

    // Reset drone pose and maps
    setDronePosition([0.0, 8.0, 0.0]);
    setDroneRotation([0.0, 0.0, 0.0]);
    roverSlamGridRef.current = Array(3600).fill(-1);
    droneSlamGridRef.current = Array(3600).fill(-1);

    // Reset chaos modes
    setChaosSensorNoise(false);
    setChaosPacketLoss(false);
    setChaosActuatorFreeze(false);
    setChaosBatteryDrop(false);
    setBatteryVoltage(24.0);

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
        roverHeading,
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
        slamGrid,
        slamWidth,
        slamHeight,
        slamResolution,
        navigationPath,
        targetWaypoint,
        isAutonomousDriving,
        Kp_steer,
        Kd_steer,
        Kp_dist,
        setKpSteer,
        setKdSteer,
        setKpDist,
        lidarRange,
        batteryVoltage,
        temperature,
        isRosConnected,
        isWsConnected,
        controlMode,
        isWorkspaceVisible,
        jointOffsets,
        saveCalibrationOffsets,
        fusedTargetPos,
        rawCameraPos,
        rawLidarPos,
        isEStopped,
        resetEStop,
        armCollisionWarning,
        isGrasping,
        setIsGrasping,
        graspingForce,
        setJointValue,
        setTargetCartesian,
        setControlMode,
        setIsWorkspaceVisible,
        setIsSmoothMode,
        triggerTrajectory,
        setNavigationWaypoint,
        setIsAutonomousDriving,
        sendDriveCommand,
        resetSimulation,
        isReplayMode,
        replayFrames,
        replayIndex,
        replayMissionId,
        setReplayMode,
        loadReplaySession,
        setReplayIndex,
        startNewMission,
        currentMissionId,
        pathfinderAlgorithm,
        setPathfinderAlgorithm,
        activeObstacles,
        setActiveObstacles,
        defaultObstacles,
        dronePosition,
        droneRotation,
        chaosSensorNoise,
        setChaosSensorNoise,
        chaosPacketLoss,
        setChaosPacketLoss,
        chaosActuatorFreeze,
        setChaosActuatorFreeze,
        chaosFrozenJointIndex,
        setChaosFrozenJointIndex,
        chaosFrozenJointAngle,
        setChaosFrozenJointAngle,
        chaosBatteryDrop,
        setChaosBatteryDrop
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
