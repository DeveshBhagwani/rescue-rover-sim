#!/usr/bin/env python3
"""
ROS2 Collaborative SLAM Costmap Merger Node
Fuses ground rover maps and aerial drone maps into a consolidated costmap.
"""

import rclpy
from rclpy.node import Node
from nav_msgs.msg import OccupancyGrid
import numpy as np

class MapMergerNode(Node):
    def __init__(self):
        super().__init__('map_merger_node')

        # Cache storage for maps
        self.rover_grid = None
        self.drone_grid = None

        # Fused Map Publishers
        self.fused_pub = self.create_publisher(OccupancyGrid, 'map_merged', 10)

        # Subscribers
        self.rover_sub = self.create_subscription(OccupancyGrid, 'map', self.rover_callback, 10)
        self.drone_sub = self.create_subscription(OccupancyGrid, 'drone/map', self.drone_callback, 10)

        self.get_logger().info("Map Merger Node initialized. Listening on /map and /drone/map...")

    def rover_callback(self, msg):
        """Ground rover SLAM occupancy grid updates."""
        self.rover_grid = msg
        self.merge_and_publish()

    def drone_callback(self, msg):
        """Overhead aerial drone SLAM occupancy grid updates."""
        self.drone_grid = msg
        self.merge_and_publish()

    def merge_and_publish(self):
        """
        Merges Ground and Aerial Occupancy Grid maps.
        
        Mathematical/Robotics Concepts:
        1. Multi-Resolution Grid Resampling:
           - Ground map is high resolution (60x60 cells, 0.5m/cell).
           - Aerial map is low resolution (30x30 cells, 1.0m/cell).
           - We scale the aerial grid by a factor of 2 in each dimension to match
             the ground coordinates frame, creating a synchronized 60x60 overlay.
        
        2. Bayesian Probability Fusion:
           - For each cell i, the fused state P_fused is calculated.
           - In standard SLAM, we take the maximum obstacle probability (worst case)
             or apply a combined cost logic:
             fused_cost[i] = max(rover_cost[i], drone_cost[i])
           - If a cell is unexplored (-1) in one map but explored (0 or 100) in the other,
             the explored state overrides the unexplored state.
        """
        if self.rover_grid is None or self.drone_grid is None:
            return # Wait until both maps have at least one message

        # 1. Compile header information from ground grid
        fused_msg = OccupancyGrid()
        fused_msg.header = self.rover_grid.header
        fused_msg.header.stamp = self.get_clock().now().to_msg()
        fused_msg.info = self.rover_grid.info # 60x60 resolution 0.5m/cell

        width = fused_msg.info.width
        height = fused_msg.info.height
        
        # Instantiate 1D flat maps as numpy arrays
        rover_data = np.array(self.rover_grid.data, dtype=np.int8)
        
        # Resample low-res drone map (30x30, 1.0m/cell) to high-res (60x60, 0.5m/cell)
        drone_data_low = np.array(self.drone_grid.data, dtype=np.int8).reshape(
            (self.drone_grid.info.height, self.drone_grid.info.width)
        )
        
        # 2D Nearest neighbor interpolation (upsampling by 2x)
        drone_data_high = np.repeat(np.repeat(drone_data_low, 2, axis=0), 2, axis=1)

        # Ensure shapes align (in case of slight boundary rounding)
        if drone_data_high.shape[0] != height or drone_data_high.shape[1] != width:
            drone_data_high = np.resize(drone_data_high, (height, width))
            
        drone_flat = drone_data_high.flatten()

        # Fusion arrays
        fused_data = np.full(width * height, -1, dtype=np.int8)

        for i in range(width * height):
            rc = rover_data[i]
            dc = drone_flat[i]

            # Unexplored override checks
            if rc == -1 and dc == -1:
                fused_data[i] = -1
            elif rc == -1:
                fused_data[i] = dc
            elif dc == -1:
                fused_data[i] = rc
            else:
                # Fusing explored costs: choose worst-case occupied probability
                fused_data[i] = max(rc, dc)

        fused_msg.data = fused_data.tolist()
        self.fused_pub.publish(fused_msg)

def main(args=None):
    rclpy.init(args=args)
    node = MapMergerNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
