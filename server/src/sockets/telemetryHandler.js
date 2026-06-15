import { WebSocketServer } from 'ws';

/**
 * setupTelemetryWebSocket sets up a WebSocket server that acts as a message broker between
 * ROS2 nodes, the simulation WebGL frontend, and user dashboards.
 * 
 * - Client -> Server: Sends joint movements, trajectory commands, steering actions.
 * - Server -> Client: Broadcasts base positions (SLAM coordinates), active lidar scans, joint load states.
 */
export function setupTelemetryWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP upgrade manually
  server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });

  // Track connected clients
  const clients = new Set();
  let rosNodeSocket = null; // References the ROS2 bridging websocket if present

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`[WebSocket] Client connected. Total clients: ${clients.size}`);

    // Send initial configuration handshake
    ws.send(JSON.stringify({
      type: 'connection_status',
      status: 'connected',
      timestamp: Date.now(),
      message: 'Telemetry Gateway Connected. Real-time channel active.'
    }));

    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message);

        // Identify if connection is the ROS2 node bridging server
        if (payload.type === 'register_ros_bridge') {
          rosNodeSocket = ws;
          console.log('[WebSocket] ROS2 telemetry bridge registered successfully.');
          broadcastToClients({ type: 'ros_status', status: 'connected' }, ws);
          return;
        }

        // Broadcast incoming telemetry (e.g. from ROS2) to all clients (React frontend)
        if (payload.type === 'joint_telemetry' || payload.type === 'base_telemetry' || payload.type === 'lidar_scan') {
          broadcastToClients(payload, ws);
        } else {
          // If the message is a control command from client dashboard, forward to ROS2 container
          if (rosNodeSocket && rosNodeSocket.readyState === rosNodeSocket.OPEN) {
            rosNodeSocket.send(JSON.stringify(payload));
          } else {
            // Echo back or handle mock response if ROS2 node is offline
            if (payload.type === 'set_joint_angles') {
              // Echo as joint_telemetry simulation fallback
              broadcastToClients({
                type: 'joint_telemetry',
                jointAngles: payload.jointAngles,
                simulated: true,
                timestamp: Date.now()
              });
            } else if (payload.type === 'drive_command') {
              broadcastToClients({
                type: 'base_telemetry',
                linearVelocity: payload.linear,
                angularVelocity: payload.angular,
                simulated: true,
                timestamp: Date.now()
              });
            }
          }
        }
      } catch (err) {
        console.error('[WebSocket] Error processing socket packet:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      if (ws === rosNodeSocket) {
        rosNodeSocket = null;
        console.log('[WebSocket] ROS2 telemetry bridge disconnected.');
        broadcastToClients({ type: 'ros_status', status: 'disconnected' });
      }
      console.log(`[WebSocket] Client disconnected. Active clients: ${clients.size}`);
    });
  });

  // Broadcast helper
  function broadcastToClients(data, sender = null) {
    const serialized = JSON.stringify(data);
    clients.forEach((client) => {
      if (client !== sender && client.readyState === client.OPEN) {
        client.send(serialized);
      }
    });
  }

  // Set up periodic mock telemetry emission for sandbox stability
  const telemetryInterval = setInterval(() => {
    if (!rosNodeSocket && clients.size > 0) {
      // Create subtle sine-wave movements to mock sensor jitter/state
      const t = Date.now() / 1000;
      const mockLidarDistance = 1.5 + Math.sin(t) * 0.2; // simulated proximity sensor reading
      const mockTelemetry = {
        type: 'sensor_telemetry',
        lidarRange: mockLidarDistance,
        batteryVoltage: 24.2 - (t % 100) * 0.01,
        temperatureCelsius: 38.5 + Math.sin(t * 0.5) * 0.5,
        simulated: true,
        timestamp: Date.now()
      };
      
      clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify(mockTelemetry));
        }
      });
    }
  }, 1000);

  return {
    wss,
    close: () => {
      clearInterval(telemetryInterval);
      wss.close();
    }
  };
}
