#!/usr/bin/env python3
"""
ROS2 Pathfinder Node for Swarm Manager
Handles Dijkstra, A*, and D* Lite path planning algorithms dynamically.
Provides comparative metrics (execution speed, path length, expanded nodes count).
"""

import rclpy
from rclpy.node import Node
from std_msgs.msg import String
from nav_msgs.msg import OccupancyGrid, Path
from geometry_msgs.msg import PoseStamped, PoseWithCovarianceStamped
import time
import math
import json
import heapq

class PathfinderNode(Node):
    def __init__(self):
        super().__init__('pathfinder_node')

        # Parameters / Configurations
        self.declare_parameter('algorithm', 'astar') # default: astar, options: astar, dijkstra, dstarlite
        self.algorithm = self.get_parameter('algorithm').get_parameter_value().string_value

        # Grid and Navigation variables
        self.grid_data = []
        self.grid_width = 0
        self.grid_height = 0
        self.grid_resolution = 0.5
        self.grid_origin_x = 0.0
        self.grid_origin_y = 0.0

        # Start and Goal coordinates (grid indices)
        self.start_x = 0
        self.start_y = 0
        self.goal_x = 0
        self.goal_y = 0

        # Publishers
        self.path_pub = self.create_publisher(Path, 'plan', 10)
        self.metrics_pub = self.create_publisher(String, 'pathfinder/metrics', 10)

        # Subscribers
        self.map_sub = self.create_subscription(OccupancyGrid, 'map', self.map_callback, 10)
        self.goal_sub = self.create_subscription(PoseStamped, 'goal_pose', self.goal_callback, 10)
        self.start_sub = self.create_subscription(PoseWithCovarianceStamped, 'initialpose', self.start_callback, 10)
        self.algo_sub = self.create_subscription(String, 'pathfinder/algorithm', self.algo_callback, 10)

        self.get_logger().info(f"Pathfinder Node initialized. Selected algorithm: {self.algorithm}")

    def map_callback(self, msg):
        """Updates grid data from LiDAR mapping SLAM nodes."""
        self.grid_data = msg.data
        self.grid_width = msg.info.width
        self.grid_height = msg.info.height
        self.grid_resolution = msg.info.resolution
        self.grid_origin_x = msg.info.origin.position.x
        self.grid_origin_y = msg.info.origin.position.y
        self.get_logger().info(f"Received occupancy grid: {self.grid_width}x{self.grid_height} at {self.grid_resolution}m/cell")

    def algo_callback(self, msg):
        """Swaps algorithm dynamically from user dashboard selection."""
        algo_name = msg.data.lower()
        if algo_name in ['astar', 'dijkstra', 'dstarlite']:
            self.algorithm = algo_name
            self.get_logger().info(f"Swapped pathfinder algorithm to: {self.algorithm}")
        else:
            self.get_logger().warn(f"Unknown pathfinder algorithm: {msg.data}")

    def start_callback(self, msg):
        """Sets starting coordinate from RViz or dashboard."""
        world_x = msg.pose.pose.position.x
        world_y = msg.pose.pose.position.y
        self.start_x, self.start_y = self.world_to_grid(world_x, world_y)
        self.get_logger().info(f"Start coordinates updated: ({self.start_x}, {self.start_y})")
        self.run_pathfinding()

    def goal_callback(self, msg):
        """Sets goal coordinate from RViz or dashboard, triggering path calculation."""
        world_x = msg.pose.position.x
        world_y = msg.pose.position.y
        self.goal_x, self.goal_y = self.world_to_grid(world_x, world_y)
        self.get_logger().info(f"Goal coordinates updated: ({self.goal_x}, {self.goal_y})")
        self.run_pathfinding()

    def world_to_grid(self, x, y):
        """Converts meters in world space to grid cell indices."""
        grid_x = int((x - self.grid_origin_x) / self.grid_resolution)
        grid_y = int((y - self.grid_origin_y) / self.grid_resolution)
        # Clamp to grid size
        grid_x = max(0, min(self.grid_width - 1, grid_x))
        grid_y = max(0, min(self.grid_height - 1, grid_y))
        return grid_x, grid_y

    def grid_to_world(self, gx, gy):
        """Converts grid indices to continuous metric coordinates."""
        world_x = gx * self.grid_resolution + self.grid_origin_x + (self.grid_resolution / 2.0)
        world_y = gy * self.grid_resolution + self.grid_origin_y + (self.grid_resolution / 2.0)
        return world_x, world_y

    def is_obstacle(self, gx, gy):
        """Returns True if the cell is blocked by rubble or unexplored."""
        if gx < 0 or gx >= self.grid_width or gy < 0 or gy >= self.grid_height:
            return True
        idx = gy * self.grid_width + gx
        if idx >= len(self.grid_data):
            return True
        # Probability threshold: 50 indicates occupied/unpassable
        return self.grid_data[idx] >= 50

    def get_neighbors(self, u):
        """Returns 8-way adjacent neighbors."""
        x, y = u
        neighbors = []
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue
                nx, ny = x + dx, y + dy
                if 0 <= nx < self.grid_width and 0 <= ny < self.grid_height:
                    neighbors.append((nx, ny))
        return neighbors

    def heuristic(self, a, b):
        """Euclidean heuristic distance metric."""
        return math.sqrt((a[0] - b[0])**2 + (a[1] - b[1])**2)

    def run_pathfinding(self):
        """Runs the selected algorithm, measures metrics, and publishes results."""
        if not self.grid_data:
            self.get_logger().warn("Cannot plan path: grid map is empty!")
            return

        start = (self.start_x, self.start_y)
        goal = (self.goal_x, self.goal_y)

        # Basic validation
        if start == goal:
            self.publish_empty_path()
            return

        self.get_logger().info(f"Running {self.algorithm} pathfinding from {start} to {goal}...")

        start_time = time.perf_counter()
        
        path = None
        nodes_expanded = 0

        if self.algorithm == 'astar':
            path, nodes_expanded = self.solve_astar(start, goal)
        elif self.algorithm == 'dijkstra':
            # Dijkstra is A* with 0 heuristic
            path, nodes_expanded = self.solve_astar(start, goal, is_dijkstra=True)
        elif self.algorithm == 'dstarlite':
            path, nodes_expanded = self.solve_dstarlite(start, goal)

        end_time = time.perf_counter()
        elapsed_ms = (end_time - start_time) * 1000.0

        if path:
            # Calculate path length (sum of segment lengths)
            path_len = 0.0
            for i in range(len(path) - 1):
                p1 = path[i]
                p2 = path[i+1]
                path_len += math.sqrt((p2[0]-p1[0])**2 + (p2[1]-p1[1])**2) * self.grid_resolution
            
            # Publish path
            self.publish_path(path)
            
            # Publish metrics
            metrics = {
                "algorithm": self.algorithm,
                "execution_time_ms": elapsed_ms,
                "nodes_expanded": nodes_expanded,
                "path_length_meters": path_len,
                "status": "success"
            }
            self.metrics_pub.publish(String(data=json.dumps(metrics)))
            self.get_logger().info(f"Path found. Length: {path_len:.2f}m, Expanded: {nodes_expanded}, Time: {elapsed_ms:.2f}ms")
        else:
            self.publish_empty_path()
            metrics = {
                "algorithm": self.algorithm,
                "execution_time_ms": elapsed_ms,
                "nodes_expanded": nodes_expanded,
                "path_length_meters": 0.0,
                "status": "failed"
            }
            self.metrics_pub.publish(String(data=json.dumps(metrics)))
            self.get_logger().warn(f"Path planning failed. Expanded nodes: {nodes_expanded}, Time: {elapsed_ms:.2f}ms")

    def solve_astar(self, start, goal, is_dijkstra=False):
        """
        Standard 8-way A* or Dijkstra implementation.
        - g_score: actual cost from start.
        - h_score: estimated cost to goal (0 for Dijkstra).
        - f_score: g_score + h_score.
        """
        open_set = []
        # Item: (f_score, counter, node) to avoid comparing tuples directly
        counter = 0
        heapq.heappush(open_set, (0.0, counter, start))
        
        came_from = {}
        g_score = {start: 0.0}
        
        # Track expanded count
        nodes_expanded = 0
        closed_set = set()

        while open_set:
            current_f, _, current = heapq.heappop(open_set)
            
            if current in closed_set:
                continue
            
            closed_set.add(current)
            nodes_expanded += 1

            if current == goal:
                # Reconstruct path
                path = []
                curr = goal
                while curr in came_from:
                    path.append(curr)
                    curr = came_from[curr]
                path.append(start)
                path.reverse()
                return path, nodes_expanded

            for neighbor in self.get_neighbors(current):
                if self.is_obstacle(neighbor[0], neighbor[1]):
                    continue

                # 8-way distance: 1.414 for diagonal, 1.0 for orthogonal
                is_diagonal = (neighbor[0] != current[0]) and (neighbor[1] != current[1])
                weight = 1.414 if is_diagonal else 1.0
                tentative_g = g_score[current] + weight

                if neighbor not in g_score or tentative_g < g_score[neighbor]:
                    came_from[neighbor] = current
                    g_score[neighbor] = tentative_g
                    h = 0.0 if is_dijkstra else self.heuristic(neighbor, goal)
                    f = tentative_g + h
                    counter += 1
                    heapq.heappush(open_set, (f, counter, neighbor))

        return None, nodes_expanded

    def solve_dstarlite(self, start, goal):
        """
        Simplification of D* Lite (Koenig & Likhachev) executed in reverse from goal to start.
        For static comparisons, we run a full reverse-planning pass.
        
        D* Lite maintains two estimates:
        - g(u): cost-to-goal estimate.
        - rhs(u): one-step lookahead estimate.
        A node is consistent if g(u) = rhs(u).
        """
        g = {}
        rhs = {}
        
        # Initialize
        rhs[goal] = 0.0
        g[goal] = float('inf')
        
        # Priority Queue containing (key1, key2, node)
        U = []
        
        def calculate_key(u):
            val = min(g.get(u, float('inf')), rhs.get(u, float('inf')))
            h = self.heuristic(start, u)
            return (val + h, val)

        def update_vertex(u):
            if u != goal:
                min_rhs = float('inf')
                for s_prime in self.get_neighbors(u):
                    if not self.is_obstacle(s_prime[0], s_prime[1]):
                        is_diagonal = (s_prime[0] != u[0]) and (s_prime[1] != u[1])
                        c = 1.414 if is_diagonal else 1.0
                        cost = g.get(s_prime, float('inf')) + c
                        if cost < min_rhs:
                            min_rhs = cost
                rhs[u] = min_rhs
            
            # Remove from queue if exists
            for idx, item in enumerate(U):
                if item[2] == u:
                    U.pop(idx)
                    heapq.heapify(U)
                    break
            
            # If inconsistent, insert into priority queue
            if g.get(u, float('inf')) != rhs.get(u, float('inf')):
                k = calculate_key(u)
                heapq.heappush(U, (k[0], k[1], u))

        # Push goal
        k_goal = calculate_key(goal)
        heapq.heappush(U, (k_goal[0], k_goal[1], goal))
        
        nodes_expanded = 0
        max_expansions = self.grid_width * self.grid_height * 2 # prevent infinite loop in degenerate states

        while U and (U[0][:2] < calculate_key(start) or rhs.get(start, float('inf')) != g.get(start, float('inf'))):
            if nodes_expanded > max_expansions:
                break
            
            k_first = U[0]
            u = k_first[2]
            k_old = (k_first[0], k_first[1])
            heapq.heappop(U)
            nodes_expanded += 1

            k_new = calculate_key(u)
            if k_old < k_new:
                heapq.heappush(U, (k_new[0], k_new[1], u))
            elif g.get(u, float('inf')) > rhs.get(u, float('inf')):
                g[u] = rhs[u]
                for s in self.get_neighbors(u):
                    if not self.is_obstacle(s[0], s[1]):
                        update_vertex(s)
            else:
                g[u] = float('inf')
                update_vertex(u)
                for s in self.get_neighbors(u):
                    if not self.is_obstacle(s[0], s[1]):
                        update_vertex(s)

        # Path reconstruction: greedy descent from start to goal based on g/rhs values
        if g.get(start, float('inf')) == float('inf'):
            return None, nodes_expanded

        path = [start]
        curr = start
        visited = {start}
        
        while curr != goal:
            best_neighbor = None
            min_cost = float('inf')
            
            for s_prime in self.get_neighbors(curr):
                if s_prime in visited:
                    continue
                if not self.is_obstacle(s_prime[0], s_prime[1]):
                    is_diagonal = (s_prime[0] != curr[0]) and (s_prime[1] != curr[1])
                    c = 1.414 if is_diagonal else 1.0
                    cost = c + g.get(s_prime, float('inf'))
                    if cost < min_cost:
                        min_cost = cost
                        best_neighbor = s_prime
            
            if best_neighbor is None:
                # Dead end in reconstruction
                return None, nodes_expanded
                
            curr = best_neighbor
            path.append(curr)
            visited.add(curr)
            
            if len(path) > self.grid_width * self.grid_height:
                break # safeguard

        return path, nodes_expanded

    def publish_path(self, path_coords):
        """Compiles nav_msgs/Path message and publishes it."""
        path_msg = Path()
        path_msg.header.stamp = self.get_clock().now().to_msg()
        path_msg.header.frame_id = 'map'

        for gx, gy in path_coords:
            pose = PoseStamped()
            pose.header.stamp = path_msg.header.stamp
            pose.header.frame_id = 'map'
            
            world_x, world_y = self.grid_to_world(gx, gy)
            pose.pose.position.x = world_x
            pose.pose.position.y = world_y
            pose.pose.position.z = 0.12 # rover height
            
            pose.pose.orientation.w = 1.0
            path_msg.poses.append(pose)

        self.path_pub.publish(path_msg)

    def publish_empty_path(self):
        path_msg = Path()
        path_msg.header.stamp = self.get_clock().now().to_msg()
        path_msg.header.frame_id = 'map'
        self.path_pub.publish(path_msg)

def main(args=None):
    rclpy.init(args=args)
    node = PathfinderNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
