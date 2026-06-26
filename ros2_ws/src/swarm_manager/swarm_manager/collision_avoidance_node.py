#!/usr/bin/env python3
"""
ROS2 Swarm Collision Avoidance Node
Runs under a namespace (e.g., /rover_1, /rover_2) to intercept raw driving
commands and execute dynamic potential-field based collision avoidance.
"""

import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from geometry_msgs.msg import Twist
import math
import json

class CollisionAvoidanceNode(Node):
    def __init__(self):
        super().__init__('collision_avoidance_node')

        # Parameters
        self.declare_parameter('safety_radius', 1.2)  # safety margin in meters
        self.safety_radius = self.get_parameter('safety_radius').get_parameter_value().double_value

        # Own identity from namespace (e.g. "/rover_1" -> "rover_1")
        raw_ns = self.get_namespace()
        self.agent_id = raw_ns.strip('/')
        if not self.agent_id:
            self.agent_id = 'rover_1'  # fallback

        # Global swarm poses cache
        self.swarm_poses = {}

        # Publishers
        # Publishes the safe, collision-free velocity to own namespace's cmd_vel
        self.cmd_pub = self.create_publisher(Twist, 'cmd_vel', 10)

        # Subscribers
        # Subscribes to raw driving commands (e.g. from pathfinder or manual controller)
        self.cmd_raw_sub = self.create_subscription(Twist, 'cmd_vel_raw', self.cmd_raw_callback, 10)
        # Subscribes to global swarm poses list
        self.swarm_sub = self.create_subscription(String, '/swarm/poses', self.swarm_poses_callback, 10)

        self.get_logger().info(f"Swarm Collision Avoidance Node active for agent: {self.agent_id} (Safety Radius: {self.safety_radius}m)")

    def swarm_poses_callback(self, msg):
        """Processes global swarm poses array to maintain other agents' positions."""
        try:
            data = json.loads(msg.data)
            # Expected schema: [ { "id": "rover_1", "position": [x, y, z] }, ... ]
            self.swarm_poses = {agent['id']: agent for agent in data}
        except Exception as e:
            self.get_logger().error(f"Failed to parse swarm poses: {e}")

    def cmd_raw_callback(self, msg):
        """Intercepts raw driving commands and calculates collision avoidance forces."""
        # Output Twist message
        safe_msg = Twist()
        safe_msg.linear.x = msg.linear.x
        safe_msg.angular.z = msg.angular.z

        # 1. If own position is unknown, skip modification and forward raw commands
        if self.agent_id not in self.swarm_poses:
            self.cmd_pub.publish(safe_msg)
            return

        own_data = self.swarm_poses[self.agent_id]
        own_pos = own_data.get('position', [0.0, 0.0, 0.0])
        ax, az = own_pos[0], own_pos[2] # ground coordinates

        # Calculate attractive heading vector based on raw command
        # Convert raw linear/angular commands into a target heading vector
        raw_heading = own_data.get('heading', 0.0)
        target_vx = msg.linear.x * math.cos(raw_heading)
        target_vz = msg.linear.x * math.sin(raw_heading)

        # 2. Accumulate repulsive potential forces from all nearby agents
        repulsive_vx = 0.0
        repulsive_vz = 0.0

        for other_id, other_data in self.swarm_poses.items():
            if other_id == self.agent_id:
                continue

            other_pos = other_data.get('position', [0.0, 0.0, 0.0])
            ox, oz = other_pos[0], other_pos[2]

            dx = ax - ox
            dz = az - oz
            dist = math.sqrt(dx*dx + dz*dz)

            # If inside the safety zone, apply repulsive vector
            if dist < self.safety_radius and dist > 0.01:
                # Force magnitude is inversely proportional to distance
                force = (self.safety_radius - dist) * 3.0
                repulsive_vx += (dx / dist) * force
                repulsive_vz += (dz / dist) * force

        # 3. Combine attractive force and repulsive force
        final_vx = target_vx + repulsive_vx
        final_vz = target_vz + repulsive_vz

        # Max allowed speed
        max_speed = max(0.2, abs(msg.linear.x))
        final_speed = math.sqrt(final_vx*final_vx + final_vz*final_vz)
        if final_speed > max_speed:
            final_vx = (final_vx / final_speed) * max_speed
            final_vz = (final_vz / final_speed) * max_speed

        # Convert final velocity vector back to Twist commands (linear and angular speed)
        if final_speed > 0.05:
            # Desired heading to move away
            desired_heading = math.atan2(final_vz, final_vx)
            heading_err = desired_heading - raw_heading

            # Normalize angle to -PI to PI
            heading_err = math.atan2(math.sin(heading_err), math.cos(heading_err))

            # Apply proportional control on angular steering
            safe_msg.linear.x = final_speed
            safe_msg.angular.z = heading_err * 2.0
        else:
            safe_msg.linear.x = 0.0
            safe_msg.angular.z = 0.0

        # Publish collision-free command
        self.cmd_pub.publish(safe_msg)

def main(args=None):
    rclpy.init(args=args)
    node = CollisionAvoidanceNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.shutdown()

if __name__ == '__main__':
    main()
