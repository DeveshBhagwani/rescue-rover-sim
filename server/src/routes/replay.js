import express from 'express';
import TelemetryModel from '../models/Telemetry.js';

const router = express.Router();

// Retrieve all unique recorded telemetry sessions with metadata
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await TelemetryModel.aggregate([
      {
        $group: {
          _id: "$metadata.missionId",
          start: { $min: "$timestamp" },
          end: { $max: "$timestamp" },
          pointsCount: { $sum: 1 }
        }
      },
      {
        $sort: { start: -1 }
      }
    ]);

    const formatted = sessions.map(s => ({
      missionId: s._id || 'unknown_mission',
      startTimestamp: s.start,
      endTimestamp: s.end,
      count: s.pointsCount
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve full high-frequency telemetry points for a specific session
router.get('/session/:missionId', async (req, res) => {
  try {
    const logs = await TelemetryModel.find({ 'metadata.missionId': req.params.missionId })
      .sort({ timestamp: 1 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Manually store telemetry points (useful for testing or batch API uploads)
router.post('/log', async (req, res) => {
  const { missionId, jointValues, jointTorques, pidErrors, odometry, manipulability, battery, temp, lidar } = req.body;
  try {
    const telemetry = new TelemetryModel({
      timestamp: new Date(),
      metadata: {
        robotName: 'RescueRover_01',
        missionId: missionId || 'mission_default'
      },
      jointValues,
      jointTorques,
      pidErrors,
      odometry,
      manipulability,
      battery,
      temp,
      lidar
    });
    const saved = await telemetry.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
