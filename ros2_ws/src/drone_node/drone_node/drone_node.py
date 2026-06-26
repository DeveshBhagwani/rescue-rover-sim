#!/usr/bin/env python3
"""
ROS2 Drone Flight Dynamics & Mapping Node
Simulates 6-DOF Quadcopter dynamics and publishes overhead /drone/map grids.
"""

import rclpy
from rclpy.node import Node
from nav_msgs.msg import OccupancyGrid
from geometry_msgs.msg import PoseStamped, Twist
import math
import numpy as np

class DroneNode(Node):
    def __init__(self):
        super().__init__('drone_node')

        # 6-DOF State Variables
        self.x = 0.0
        self.y = 8.0 # Starting altitude in meters
        self.z = 0.0
        self.vx = 0.0
        self.vy = 0.0
        self.vz = 0.0
        
        self.roll = 0.0
        self.pitch = 0.0
        self.yaw = 0.0
        self.p = 0.0 # angular rates (rad/s)
        self.q = 0.0
        self.r = 0.0

        # Target Coordinates (setpoints)
        self.target_x = 0.0
        self.target_y = 8.0
        self.target_z = 0.0
        self.target_yaw = 0.0

        # Physical constants
        self.mass = 1.5 # kg
        self.gravity = 9.81 # m/s^2
        self.ix = 0.015 # Moments of Inertia (kg*m^2)
        self.iy = 0.015
        self.iz = 0.025
        self.drag_coeff = 0.15

        # Map details
        self.map_width = 30 # Downsampled map size for drone map (30x30 cells)
        self.map_height = 30
        self.map_resolution = 1.0 # 1.0m per cell (lower resolution than rover map)
        self.map_origin_x = -15.0
        self.map_origin_y = -15.0

        # Publishers & Subscribers
        self.map_pub = self.create_publisher(OccupancyGrid, 'drone/map', 10)
        self.pose_pub = self.create_publisher(PoseStamped, 'drone/pose', 10)
        
        self.cmd_sub = self.create_subscription(Twist, 'drone/cmd_vel', self.cmd_callback, 10)

        # Simulation Timer Loop (50Hz = 0.02s step)
        self.dt = 0.02
        self.sim_timer = self.create_timer(self.dt, self.update_simulation)
        self.map_timer = self.create_timer(1.0, self.publish_overhead_map)

        self.get_logger().info("Collaborative Aerial SLAM Node initialized.")

    def cmd_callback(self, msg):
        """Processes linear and angular velocities to setpoint positions."""
        self.target_x += msg.linear.x * self.dt * 10.0
        self.target_z += msg.linear.y * self.dt * 10.0
        self.target_y += msg.linear.z * self.dt * 5.0
        self.target_yaw += msg.angular.z * self.dt * 2.0

        # Clamp boundaries
        self.target_x = max(-14.0, min(14.0, self.target_x))
        self.target_z = max(-14.0, min(14.0, self.target_z))
        self.target_y = max(4.0, min(12.0, self.target_y))

    def update_simulation(self):
        """
        Updates 6-DOF Quadcopter Flight Dynamics.
        
        Robotics Concepts:
        1. Cascaded Position/Attitude Loop:
           - Positions errors determine desired roll and pitch target angles:
             phi_des = Kp_pos * (z_err) * cos(yaw) - Kp_pos * (x_err) * sin(yaw)
             theta_des = Kp_pos * (x_err) * cos(yaw) + Kp_pos * (z_err) * sin(yaw)
           - Attitude loop calculates thruster forces and torque inputs from
             Euler angles error terms.
        
        2. Quadcopter Newton-Euler Equations:
           - F_total = thrust * R_matrix * [0, 0, 1]^T - mass * gravity * [0, 0, 1]^T
           - Torques = I * omega_dot + omega x (I * omega)
        """
        # Position error inputs (PID controllers approximation)
        ex = self.target_x - self.x
        ey = self.target_y - self.y
        ez = self.target_z - self.z

        # 1. Outer position controller calculates target roll & pitch angles
        pitch_des = 0.15 * ex - 0.08 * self.vx
        roll_des = -0.15 * ez + 0.08 * self.vz
        
        # Clamp attitude setpoints to prevent flips (max 25 degrees)
        max_angle = 25.0 * math.pi / 180.0
        roll_des = max(-max_angle, min(max_angle, roll_des))
        pitch_des = max(-max_angle, min(max_angle, pitch_des))

        # Vertical force command
        thrust = self.mass * (self.gravity + 2.5 * ey - 1.2 * self.vy)
        thrust = max(0.0, min(self.mass * self.gravity * 2.2, thrust))

        # 2. Inner attitude rate controllers calculate body torques
        torque_roll = 4.0 * (roll_des - self.roll) - 0.8 * self.p
        torque_pitch = 4.0 * (pitch_des - self.pitch) - 0.8 * self.q
        
        yaw_err = self.target_yaw - self.yaw
        while yaw_err > math.PI: yaw_err -= 2 * math.PI
        while yaw_err < -math.PI: yaw_err += 2 * math.PI
        torque_yaw = 2.0 * yaw_err - 0.5 * self.r

        # 3. Dynamic rigid body accelerations
        # Linear accelerations (Newton's Second Law with drag)
        ax = (thrust * (math.sin(self.roll) * math.sin(self.yaw) + math.cos(self.roll) * math.sin(self.pitch) * math.cos(self.yaw)) - self.drag_coeff * self.vx) / self.mass
        ay = (thrust * (math.cos(self.roll) * math.cos(self.pitch)) - self.mass * self.gravity - self.drag_coeff * self.vy) / self.mass
        az = (thrust * (math.sin(self.roll) * math.cos(self.yaw) - math.cos(self.roll) * math.sin(self.pitch) * math.sin(self.yaw)) - self.drag_coeff * self.vz) / self.mass

        # Angular accelerations (Euler's equations)
        dp = torque_roll / self.ix
        dq = torque_pitch / self.iy
        dr = torque_yaw / self.iz

        # 4. State Euler integration
        self.vx += ax * self.dt
        self.vy += ay * self.dt
        self.vz += az * self.dt
        self.x += self.vx * self.dt
        self.y += self.vy * self.dt
        self.z += self.vz * self.dt

        self.p += dp * self.dt
        self.q += dq * self.dt
        self.r += dr * self.dt
        self.roll += self.p * self.dt
        self.pitch += self.q * self.dt
        self.yaw += self.r * self.dt

        # Publish drone pose telemetry
        self.publish_pose()

    def publish_pose(self):
        msg = PoseStamped()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = 'map'
        msg.pose.position.x = self.x
        msg.pose.position.y = self.y
        msg.pose.position.z = self.z
        
        # Quaternion translation from Euler angles
        cy = math.cos(self.yaw * 0.5)
        sy = math.sin(self.yaw * 0.5)
        cp = math.cos(self.pitch * 0.5)
        sp = math.sin(self.pitch * 0.5)
        cr = math.cos(self.roll * 0.5)
        sr = math.sin(self.roll * 0.5)

        msg.pose.orientation.w = cy * cp * cr + sy * sp * sr
        msg.pose.orientation.x = cy * cp * sr - sy * sp * cr
        msg.pose.orientation.y = cy * sp * cr + sy * cp * sr
        msg.pose.orientation.z = sy * cp * cr - cy * sp * sr

        self.pose_pub.publish(msg)

    def publish_overhead_map(self):
        """
        Simulates overhead scanning mapping from high-altitude viewpoint.
        Projects wide-angle sensor footprint to grid indices and publishes grid maps.
        """
        msg = OccupancyGrid()
        msg.header.stamp = self.get_clock().now().to_msg()
        msg.header.frame_id = 'map'

        msg.info.resolution = self.map_resolution
        msg.info.width = self.map_width
        msg.info.height = self.map_height
        msg.info.origin.position.x = self.map_origin_x
        msg.info.origin.position.y = self.map_origin_y
        msg.info.origin.position.z = 0.0

        # Occupancy grid generation: -1: Unexplored, 0: Free, 100: Obstacle
        # Simulate scanning: Drone visibility cone has a radius proportional to altitude (y)
        scan_radius = self.y * 1.0 # 8.0 meters altitude = 8.0m radius of view
        grid_data = np.full((self.map_height, self.map_width), -1, dtype=np.int8)

        # Predefined static disaster zone obstacles mapping (world coordinates)
        obstacles = [
            (-3.0, 3.0, 0.9), (3.0, -3.0, 1.1), (-2.0, -4.0, 0.7),
            (4.0, 2.0, 0.8), (0.0, 5.0, 1.3), (-5.0, 0.0, 0.7),
            (5.0, 5.0, 0.8), (1.5, 2.5, 0.6), (-1.5, 1.5, 0.6)
        ]

        for r in range(self.map_height):
            for c in range(self.map_width):
                # Calculate cell world coordinates
                wx = c * self.map_resolution + self.map_origin_x + self.map_resolution/2.0
                wz = r * self.map_resolution + self.map_origin_y + self.map_resolution/2.0

                # Compute distance to drone position
                dx = wx - self.x
                dz = wz - self.z
                dist = math.sqrt(dx*dx + dz*dz)

                if dist <= scan_radius:
                    # Inside visibility footprint - mark as free initially
                    grid_data[r, c] = 0
                    
                    # Verify obstacle collisions
                    for ox, oz, rad in obstacles:
                        d_obs = math.sqrt((wx - ox)**2 + (wz - oz)**2)
                        if d_obs <= rad + 0.4:
                            grid_data[r, c] = 100 # Obstacle detected
                            break

        msg.data = grid_data.flatten().tolist()
        self.map_pub.publish(msg)

def main(args=None):
    rclpy.init(args=args)
    node = DroneNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
