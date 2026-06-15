import mongoose from 'mongoose';

/**
 * CalibrationSchema stores joint zero offsets, link length adjustments, and camera extrinsics.
 * These parameters are critical for correcting systematic errors in Forward/Inverse Kinematics (FK/IK)
 * and camera-to-end-effector transformations (Hand-Eye Calibration).
 */
const CalibrationSchema = new mongoose.Schema({
  robotName: { 
    type: String, 
    required: true, 
    default: 'RescueRover_01' 
  },
  jointOffsets: {
    type: [Number],
    required: true,
    validate: [val => val.length === 6, 'Must provide offsets for exactly 6 joints.'],
    comment: 'Zero position offsets (in radians) for the 6-DOF arm joints.'
  },
  wheelBaseWidth: { 
    type: Number, 
    required: true, 
    default: 0.55, 
    comment: 'Distance between left and right wheels in meters, used in differential drive odometry.' 
  },
  wheelRadius: { 
    type: Number, 
    required: true, 
    default: 0.12, 
    comment: 'Radius of mobile wheels in meters, used to calculate linear velocity from motor RPM.' 
  },
  cameraOffset: {
    position: {
      x: { type: Number, default: 0.1 },
      y: { type: Number, default: 0.0 },
      z: { type: Number, default: 0.4 }
    },
    rotation: {
      roll: { type: Number, default: 0.0 },
      pitch: { type: Number, default: 0.0 },
      yaw: { type: Number, default: 0.0 }
    }
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

export default mongoose.model('Calibration', CalibrationSchema);
