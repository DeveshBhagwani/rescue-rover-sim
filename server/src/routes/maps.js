import express from 'express';
import MapModel from '../models/MapSchema.js';

const router = express.Router();

// Retrieve the latest saved SLAM map
router.get('/latest', async (req, res) => {
  try {
    const latestMap = await MapModel.findOne().sort({ createdAt: -1 });
    if (!latestMap) {
      return res.status(404).json({ message: 'No maps found' });
    }
    res.json(latestMap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save a new SLAM map session
router.post('/', async (req, res) => {
  const { name, resolution, width, height, origin, gridData } = req.body;
  try {
    const newMap = new MapModel({
      name,
      resolution,
      width,
      height,
      origin,
      gridData
    });
    const savedMap = await newMap.save();
    res.status(201).json(savedMap);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
