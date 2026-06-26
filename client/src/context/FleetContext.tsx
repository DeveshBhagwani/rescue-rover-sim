import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

export interface SwarmAgent {
  id: string;
  type: 'rover' | 'drone';
  position: [number, number, number]; // [x, y, z]
  heading: number; // yaw in radians
  rotation: [number, number, number]; // [roll, pitch, yaw]
  battery: number;
  temperature: number;
  lidarRange: number;
  path: { x: number; z: number }[] | null;
  targetWaypoint: { x: number; z: number } | null;
  status: 'online' | 'offline';
  speed: number;
}

interface FleetContextType {
  agents: SwarmAgent[];
  isWsConnected: boolean;
  isRosConnected: boolean;
  sendAgentDriveCommand: (agentId: string, linear: number, angular: number) => void;
  setAgentWaypoint: (agentId: string, x: number, z: number) => void;
  clearAgentWaypoint: (agentId: string) => void;
  triggerSwarmMission: () => void;
  resetSwarm: () => void;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agents, setAgents] = useState<SwarmAgent[]>([
    {
      id: 'rover_1',
      type: 'rover',
      position: [-2.0, 0.12, -2.0],
      heading: 0.0,
      rotation: [0, 0, 0],
      battery: 100.0,
      temperature: 36.5,
      lidarRange: 2.0,
      path: null,
      targetWaypoint: null,
      status: 'online',
      speed: 0.8
    },
    {
      id: 'rover_2',
      type: 'rover',
      position: [2.0, 0.12, 2.0],
      heading: Math.PI,
      rotation: [0, Math.PI, 0],
      battery: 98.5,
      temperature: 37.2,
      lidarRange: 2.5,
      path: null,
      targetWaypoint: null,
      status: 'online',
      speed: 0.8
    },
    {
      id: 'drone_1',
      type: 'drone',
      position: [0.0, 6.0, 0.0],
      heading: 0.0,
      rotation: [0, 0, 0],
      battery: 95.0,
      temperature: 39.0,
      lidarRange: 6.0,
      path: null,
      targetWaypoint: null,
      status: 'online',
      speed: 1.5
    }
  ]);

  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isRosConnected, setIsRosConnected] = useState<boolean>(false);
  const socketRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket Gateway
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

        // Process swarm status and individual agent telemetries
        if (payload.type === 'ros_status') {
          setIsRosConnected(payload.status === 'connected');
        } else if (payload.type === 'swarm_telemetry') {
          const { agentId, position, heading, battery, temp, lidar, path, targetWaypoint } = payload;
          setAgents((prevAgents) =>
            prevAgents.map((agent) => {
              if (agent.id === agentId) {
                return {
                  ...agent,
                  position: position || agent.position,
                  heading: heading !== undefined ? heading : agent.heading,
                  rotation: [0, heading !== undefined ? heading : agent.heading, 0],
                  battery: battery !== undefined ? battery : agent.battery,
                  temperature: temp !== undefined ? temp : agent.temperature,
                  lidarRange: lidar !== undefined ? lidar : agent.lidarRange,
                  path: path || agent.path,
                  targetWaypoint: targetWaypoint || agent.targetWaypoint,
                  status: 'online'
                };
              }
              return agent;
            })
          );
        }
      } catch (err) {
        console.error('[FleetContext] WebSocket parsing error:', err);
      }
    };

    ws.onclose = () => {
      setIsWsConnected(false);
      setIsRosConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  // Send velocity command to specific agent
  const sendAgentDriveCommand = useCallback((agentId: string, linear: number, angular: number) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'swarm_drive_command',
        agentId,
        linear,
        angular,
        timestamp: Date.now()
      }));
    }

    // Local execution fallback if ROS2 is offline
    if (!isRosConnected) {
      setAgents((prev) =>
        prev.map((agent) => {
          if (agent.id === agentId) {
            const nextHeading = agent.heading + angular * 0.05;
            const nextX = agent.position[0] + Math.cos(nextHeading) * linear * 0.05;
            const nextZ = agent.position[2] + Math.sin(nextHeading) * linear * 0.05;
            return {
              ...agent,
              heading: nextHeading,
              rotation: [0, nextHeading, 0],
              position: [nextX, agent.position[1], nextZ]
            };
          }
          return agent;
        })
      );
    }
  }, [isRosConnected]);

  // Set waypoint for specific agent
  const setAgentWaypoint = useCallback((agentId: string, x: number, z: number) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'swarm_set_waypoint',
        agentId,
        x,
        z,
        timestamp: Date.now()
      }));
    }

    setAgents((prev) =>
      prev.map((agent) => {
        if (agent.id === agentId) {
          // Generate a straight line path to the target
          const pathSteps = [];
          const startX = agent.position[0];
          const startZ = agent.position[2];
          const steps = 10;
          for (let i = 1; i <= steps; i++) {
            pathSteps.push({
              x: startX + ((x - startX) * i) / steps,
              z: startZ + ((z - startZ) * i) / steps
            });
          }
          return {
            ...agent,
            targetWaypoint: { x, z },
            path: pathSteps
          };
        }
        return agent;
      })
    );
  }, []);

  // Clear waypoint
  const clearAgentWaypoint = useCallback((agentId: string) => {
    setAgents((prev) =>
      prev.map((agent) => {
        if (agent.id === agentId) {
          return {
            ...agent,
            targetWaypoint: null,
            path: null
          };
        }
        return agent;
      })
    );
  }, []);

  // Trigger Swarm Mission (automatic crossover trajectories)
  const triggerSwarmMission = useCallback(() => {
    // Send rovers on crossing paths to test collision avoidance
    setAgentWaypoint('rover_1', 2.0, 2.0);
    setAgentWaypoint('rover_2', -2.0, -2.0);
    setAgentWaypoint('drone_1', 0.0, 0.0);
  }, [setAgentWaypoint]);

  // Reset Swarm to initial positions
  const resetSwarm = useCallback(() => {
    setAgents([
      {
        id: 'rover_1',
        type: 'rover',
        position: [-2.0, 0.12, -2.0],
        heading: 0.0,
        rotation: [0, 0, 0],
        battery: 100.0,
        temperature: 36.5,
        lidarRange: 2.0,
        path: null,
        targetWaypoint: null,
        status: 'online',
        speed: 0.8
      },
      {
        id: 'rover_2',
        type: 'rover',
        position: [2.0, 0.12, 2.0],
        heading: Math.PI,
        rotation: [0, Math.PI, 0],
        battery: 98.5,
        temperature: 37.2,
        lidarRange: 2.5,
        path: null,
        targetWaypoint: null,
        status: 'online',
        speed: 0.8
      },
      {
        id: 'drone_1',
        type: 'drone',
        position: [0.0, 6.0, 0.0],
        heading: 0.0,
        rotation: [0, 0, 0],
        battery: 95.0,
        temperature: 39.0,
        lidarRange: 6.0,
        path: null,
        targetWaypoint: null,
        status: 'online',
        speed: 1.5
      }
    ]);
  }, []);

  // High-fidelity local simulation loop with collision avoidance (Potential Fields model)
  useEffect(() => {
    if (isRosConnected) return; // Defer to ROS2 nodes if online

    const interval = setInterval(() => {
      setAgents((prevAgents) => {
        return prevAgents.map((agent) => {
          if (!agent.targetWaypoint) return agent;

          // 1. Calculate attractive force towards target waypoint
          const tx = agent.targetWaypoint.x;
          const tz = agent.targetWaypoint.z;
          const ax = agent.position[0];
          const az = agent.position[2];

          const dx = tx - ax;
          const dz = tz - az;
          const distToTarget = Math.sqrt(dx * dx + dz * dz);

          if (distToTarget < 0.15) {
            // Target reached! Clear waypoint
            return {
              ...agent,
              targetWaypoint: null,
              path: null
            };
          }

          // Desired heading and velocity vector
          let desiredHeading = Math.atan2(dz, dx);
          let targetVx = Math.cos(desiredHeading) * agent.speed;
          let targetVz = Math.sin(desiredHeading) * agent.speed;

          // 2. Swarm collision avoidance: calculate repulsive force from other rovers
          let repulsiveX = 0;
          let repulsiveZ = 0;
          const safetyRadius = 1.2; // meters

          prevAgents.forEach((other) => {
            if (other.id === agent.id || other.type === 'drone') return;

            const ox = other.position[0];
            const oz = other.position[2];
            const odx = ax - ox;
            const odz = az - oz;
            const distToOther = Math.sqrt(odx * odx + odz * odz);

            if (distToOther < safetyRadius && distToOther > 0.01) {
              // Strong repulsive potential field force
              const forceMagnitude = (safetyRadius - distToOther) * 2.5;
              repulsiveX += (odx / distToOther) * forceMagnitude;
              repulsiveZ += (odz / distToOther) * forceMagnitude;
            }
          });

          // Fuse attractive and repulsive forces
          let finalVx = targetVx + repulsiveX;
          let finalVz = targetVz + repulsiveZ;

          // Normalize velocity if exceeding max speed
          const finalSpeed = Math.sqrt(finalVx * finalVx + finalVz * finalVz);
          if (finalSpeed > agent.speed) {
            finalVx = (finalVx / finalSpeed) * agent.speed;
            finalVz = (finalVz / finalSpeed) * agent.speed;
          }

          // Calculate next position & heading
          const dt = 0.05; // 50ms interval
          const nextX = ax + finalVx * dt;
          const nextZ = az + finalVz * dt;
          const nextHeading = Math.atan2(finalVz, finalVx);

          // Simulate drone specific hover dynamics
          const nextY = agent.type === 'drone' 
            ? agent.position[1] + Math.sin(Date.now() / 300) * 0.02 
            : agent.position[1];

          // Subsample and update the path overlay trail
          const nextPath = agent.path ? agent.path.filter((_, i) => i > 0) : null;

          return {
            ...agent,
            position: [nextX, nextY, nextZ],
            heading: nextHeading,
            rotation: agent.type === 'drone' 
              ? [finalVx * -0.05, 0, nextHeading] 
              : [0, nextHeading, 0],
            path: nextPath && nextPath.length > 0 ? nextPath : null,
            battery: Math.max(0, agent.battery - dt * 0.05),
            temperature: 36.5 + Math.sin(Date.now() / 10000) * 0.5
          };
        });
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isRosConnected]);

  return (
    <FleetContext.Provider
      value={{
        agents,
        isWsConnected,
        isRosConnected,
        sendAgentDriveCommand,
        setAgentWaypoint,
        clearAgentWaypoint,
        triggerSwarmMission,
        resetSwarm
      }}
    >
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (context === undefined) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
};
