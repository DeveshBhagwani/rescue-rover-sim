#include "rclcpp/rclcpp.hpp"
#include "std_msgs/msg/string.hpp"

/**
 * NavigationNode handles SLAM (Simultaneous Localization and Mapping)
 * and Path Planning (A*, RRT) calculations.
 * In Phase 4, this node will map the environment from lidar updates
 * and solve optimal path coordinates to targets.
 */
class NavigationNode : public rclcpp::Node {
public:
  NavigationNode() : Node("navigation_node") {
    RCLCPP_INFO(this->get_logger(), "Navigation (SLAM & Path Planning) Node initialized.");
  }
};

int main(int argc, char **argv) {
  rclcpp::init(argc, argv);
  auto node = std::make_shared<NavigationNode>();
  rclcpp::spin(node);
  rclcpp::shutdown();
  return 0;
}
