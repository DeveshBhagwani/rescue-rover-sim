import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import mapsRouter from './routes/maps.js';
import calibrationRouter from './routes/calibration.js';
import { setupTelemetryWebSocket } from './sockets/telemetryHandler.js';

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rescue-rover';

const app = express();
const server = http.createServer(app);

// Express Middleware
app.use(cors());
app.use(express.json());

// Mount API Routes
app.use('/api/maps', mapsRouter);
app.use('/api/calibration', calibrationRouter);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    rosBridgeStatus: 'disconnected', // Initialized as disconnected
    dbStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date()
  });
});

// Setup Telemetry WebSockets
const telemetryWss = setupTelemetryWebSocket(server);

// Database Connection
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log(`[Database] MongoDB connected at ${MONGO_URI}`);
  })
  .catch((err) => {
    console.warn(`[Database] Warning: MongoDB failed to connect (${err.message}). Simulator will run with in-memory fallback.`);
  });

// Start Server listening
server.listen(PORT, () => {
  console.log(`[Server] RescueRover Sim Gateway listening on port ${PORT}`);
});
