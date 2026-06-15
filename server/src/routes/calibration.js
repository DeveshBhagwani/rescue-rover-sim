import express from 'express';
import CalibrationModel from '../models/CalibrationSchema.js';

const router = express.Router();

// Retrieve calibration configurations for a robot
router.get('/:robotName', async (req, res) => {
  try {
    const calibration = await CalibrationModel.findOne({ robotName: req.params.robotName });
    if (!calibration) {
      // Return a default configuration if no record exists in database
      const defaultCalibration = {
        robotName: req.params.robotName,
        jointOffsets: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        wheelBaseWidth: 0.55,
        wheelRadius: 0.12,
        cameraOffset: {
          position: { x: 0.1, y: 0.0, z: 0.4 },
          rotation: { roll: 0.0, pitch: 0.0, yaw: 0.0 }
        }
      };
      return res.json(defaultCalibration);
    }
    res.json(calibration);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create or update calibration configs
router.post('/', async (req, res) => {
  const { robotName, jointOffsets, wheelBaseWidth, wheelRadius, cameraOffset } = req.body;
  try {
    const query = { robotName };
    const update = {
      jointOffsets,
      wheelBaseWidth,
      wheelRadius,
      cameraOffset,
      updatedAt: new Date()
    };
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    const calibration = await CalibrationModel.findOneAndUpdate(query, update, options);
    res.json(calibration);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
