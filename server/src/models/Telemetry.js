import mongoose from 'mongoose';

/**
 * TelemetrySchema configures a MongoDB Time Series Collection to log high-frequency
 * robotic state updates (e.g. joint positions, loads, control errors, and 3D pose odometry).
 */
const TelemetrySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true,
    index: true
  },
  metadata: {
    robotName: {
      type: String,
      required: true,
      default: 'RescueRover_01'
    },
    missionId: {
      type: String,
      required: true,
      index: true
    }
  },
  jointValues: {
    type: [Number],
    required: true
  },
  jointTorques: {
    type: [Number],
    required: true
  },
  pidErrors: {
    steer: { type: Number, default: 0.0 },
    distance: { type: Number, default: 0.0 }
  },
  odometry: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    z: { type: Number, required: true },
    heading: { type: Number, required: true }
  },
  manipulability: {
    type: Number,
    default: 0.0
  },
  battery: {
    type: Number,
    default: 24.0
  },
  temp: {
    type: Number,
    default: 37.0
  },
  lidar: {
    type: Number,
    default: 0.0
  }
}, {
  // Configures the MongoDB time-series collection parameters
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'seconds'
  }
});

export default mongoose.model('Telemetry', TelemetrySchema);
