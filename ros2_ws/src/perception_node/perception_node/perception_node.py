import rclpy
from rclpy.node import Node
from std_msgs.msg import String

class PerceptionNode(Node):
    """
    PerceptionNode integrates sensor streams (camera image pixels and lidar lasers scans)
    to perform object identification and local collision detection.
    In Phase 5, it fuses data to guide the end-effector accurately toward extraction targets.
    """
    def __init__(self):
        super().__init__('perception_node')
        self.get_logger().info('Perception (Vision & Sensor Fusion) Node initialized.')

def main(args=None):
    rclpy.init(args=args)
    node = PerceptionNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.shutdown()

if __name__ == '__main__':
    main()
