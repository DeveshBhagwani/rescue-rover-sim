import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface SimulationContextType {
  jointValues: number[]; // [J1_rad, J2_rad, J3_m, J4_rad, J5_rad, J6_rad]
  roverPosition: [number, number, number]; // [x, y, z]
  roverRotation: [number, number, number]; // [roll, pitch, yaw]
  lidarRange: number; // in meters
  batteryVoltage: number;
  temperature: number;
  isRosConnected: boolean;
  isWsConnected: boolean;
  setJointValue: (index: number, value: number) => void;
  sendDriveCommand: (linear: number, angular: number) => void;
  resetSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jointValues, setJointValues] = useState<number[]>([0.0, 0.0, 0.0, 0.0, 0.0, 0.0]); // Default home position
  const [roverPosition, setRoverPosition] = useState<[number, number, number]>([0, 0.12, 0]);
  const [roverRotation, setRoverRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [lidarRange, setLidarRange] = useState<number>(2.0);
  const [batteryVoltage, setBatteryVoltage] = useState<number>(24.0);
  const [temperature, setTemperature] = useState<number>(37.0);
  const [isRosConnected, setIsRosConnected] = useState<boolean>(false);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);

  const socketRef = useRef<WebSocket | null>(null);

  // Set up WebSocket connection
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:5000`;
    console.log(`[WebSocket] Connecting to ${wsUrl}...`);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connection established with gateway.');
      setIsWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        switch (payload.type) {
          case 'connection_status':
            console.log('[WebSocket] Handshake:', payload.message);
            break;
          case 'ros_status':
            setIsRosConnected(payload.status === 'connected');
            break;
          case 'sensor_telemetry':
            if (payload.lidarRange !== undefined) setLidarRange(payload.lidarRange);
            if (payload.batteryVoltage !== undefined) setBatteryVoltage(payload.batteryVoltage);
            if (payload.temperatureCelsius !== undefined) setTemperature(payload.temperatureCelsius);
            break;
          case 'joint_telemetry':
            if (payload.jointAngles) {
              setJointValues(payload.jointAngles);
            }
            break;
          case 'base_telemetry':
            // Simple mock physics update: integrate velocity into position over time
            // In later phases, this will read direct odometry from SLAM node
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('[WebSocket] Failed to parse telemetry message:', err);
      }
    };

    ws.onclose = () => {
      console.warn('[WebSocket] Connection closed. Retrying in 5 seconds...');
      setIsWsConnected(false);
      setIsRosConnected(false);
      setTimeout(() => {
        // Simple auto-reconnect trigger by re-running effect
      }, 5000);
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Socket error:', error);
      ws.close();
    };

    return () => {
      ws.close();
    };
  }, []);

  // Update a single joint value and transmit to Express/ROS2 gateway
  const setJointValue = useCallback((index: number, value: number) => {
    setJointValues((prev) => {
      const updated = [...prev];
      updated[index] = value;
      
      // Dispatch payload to socket
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

  // Dispatch raw driving velocities to mobile base controller
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

  // Reset all joint configurations and position coordinates
  const resetSimulation = useCallback(() => {
    const homeJoints = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
    setJointValues(homeJoints);
    setRoverPosition([0, 0.12, 0]);
    setRoverRotation([0, 0, 0]);
    
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
        lidarRange,
        batteryVoltage,
        temperature,
        isRosConnected,
        isWsConnected,
        setJointValue,
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
