import mongoose from 'mongoose';

/**
 * MapSchema represents the occupancy grid generated during SLAM (Simultaneous Localization and Mapping).
 * Occupancy grids divide the environment into discrete cells, where each cell contains a probability 
 * representing whether it is occupied (rubble/obstacle), free space, or unexplored.
 */
const MapSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    default: 'Disaster Zone Map'
  },
  resolution: { 
    type: Number, 
    required: true, 
    comment: 'Grid resolution in meters per cell (e.g., 0.05 m/cell)' 
  },
  width: { 
    type: Number, 
    required: true, 
    comment: 'Number of cells along the X axis' 
  },
  height: { 
    type: Number, 
    required: true, 
    comment: 'Number of cells along the Y axis' 
  },
  origin: {
    position: {
      x: { type: Number, default: 0.0 },
      y: { type: Number, default: 0.0 },
      z: { type: Number, default: 0.0 }
    },
    orientation: {
      x: { type: Number, default: 0.0 },
      y: { type: Number, default: 0.0 },
      z: { type: Number, default: 0.0 },
      w: { type: Number, default: 1.0 }
    }
  },
  gridData: { 
    type: [Number], 
    required: true, 
    comment: 'Occupancy probabilities: -1 for unknown, 0 for free space, 100 for occupied.' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model('Map', MapSchema);
