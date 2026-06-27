#include "rclcpp/rclcpp.hpp"
#include "std_msgs/msg/string.hpp"

/**
 * NavigationNode handles SLAM
 * and Path Planning (A*, RRT) calculations.
 */
class NavigationNode : public rclcpp::Node {
public:
  NavigationNode() : Node("navigation_node") {
    RCLCPP_INFO(this->get_logger(),
                "Navigation (SLAM & Path Planning) Node initialized.");
  }
};

int main(int argc, char **argv) {
  rclcpp::init(argc, argv);
  auto node = std::make_shared<NavigationNode>();
  rclcpp::spin(node);
  rclcpp::shutdown();
  return 0;
}
