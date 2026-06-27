#include "geometry_msgs/msg/pose_stamped.hpp"
#include "rclcpp/rclcpp.hpp"
#include "sensor_msgs/msg/laser_scan.hpp"
#include "std_msgs/msg/string.hpp"
#include <chrono>
#include <cmath>
#include <memory>
#include <random>
#include <string>

/**
 * NoiseInjectorNode intercepts raw telemetry/sensor channels to simulate
 * hardware faults and environment packet loss (Chaos Mode).
 *
 * Mathematical Concepts:
 * 1. Gaussian Noise Generation (Box-Muller Transform):
 *    Calculates normally distributed random numbers from uniform distributions:
 *    Z0 = sqrt(-2.0 * ln(U1)) * cos(2.0 * pi * U2)
 *    Where U1, U2 are independent variables uniformly distributed in [0, 1].
 *    The result Z0 has a mean of 0.0 and variance of 1.0. Scaled it by
 *    multiplying by standard deviation (sigma) and adding the mean (mu):
 *    X = mu + Z0 * sigma
 *
 * 2. Bernoulli Trial (Packet Loss/Delay):
 *    Models communication package drop as a discrete probability distribution.
 *    For packet loss rate p in [0, 1], draw a uniform variable U in [0, 1].
 *    If U < p, the packet is discarded, otherwise it is published.
 */
class NoiseInjectorNode : public rclcpp::Node {
public:
  NoiseInjectorNode() : Node("noise_injector_node") {
    // Declare dynamic configuration parameters
    this->declare_parameter("sensor_noise_enabled", false);
    this->declare_parameter("sensor_noise_stddev",
                            0.15); // meters of range noise
    this->declare_parameter("packet_loss_enabled", false);
    this->declare_parameter("packet_loss_rate", 0.25); // 25% drop rate

    // Subscriptions
    fault_config_sub_ = this->create_subscription<std_msgs::msg::String>(
        "/chaos/fault_config", 10,
        std::bind(&NoiseInjectorNode::config_callback, this,
                  std::placeholders::_1));

    lidar_raw_sub_ = this->create_subscription<sensor_msgs::msg::LaserScan>(
        "/lidar/raw", 10,
        std::bind(&NoiseInjectorNode::lidar_callback, this,
                  std::placeholders::_1));

    odom_raw_sub_ = this->create_subscription<geometry_msgs::msg::PoseStamped>(
        "/odom/raw", 10,
        std::bind(&NoiseInjectorNode::odom_callback, this,
                  std::placeholders::_1));

    // Publishers
    lidar_pub_ =
        this->create_publisher<sensor_msgs::msg::LaserScan>("/lidar/scan", 10);
    odom_pub_ =
        this->create_publisher<geometry_msgs::msg::PoseStamped>("/odom", 10);

    // Seed C++ random generator
    std::random_device rd;
    rng_ = std::mt19937(rd());
    uniform_dist_ = std::uniform_real_distribution<double>(0.0, 1.0);

    RCLCPP_INFO(this->get_logger(), "Chaos Fault Injection Node initialized.");
  }

private:
  // Random generators
  std::mt19937 rng_;
  std::uniform_real_distribution<double> uniform_dist_;

  // Node parameters
  bool sensor_noise_enabled_ = false;
  double sensor_noise_stddev_ = 0.15;
  bool packet_loss_enabled_ = false;
  double packet_loss_rate_ = 0.25;

  // Subscribers & Publishers
  rclcpp::Subscription<std_msgs::msg::String>::SharedPtr fault_config_sub_;
  rclcpp::Subscription<sensor_msgs::msg::LaserScan>::SharedPtr lidar_raw_sub_;
  rclcpp::Subscription<geometry_msgs::msg::PoseStamped>::SharedPtr
      odom_raw_sub_;

  rclcpp::Publisher<sensor_msgs::msg::LaserScan>::SharedPtr lidar_pub_;
  rclcpp::Publisher<geometry_msgs::msg::PoseStamped>::SharedPtr odom_pub_;

  /**
   * Helper implementing Box-Muller transform for Gaussian distribution.
   */
  double generate_gaussian(double mean, double stddev) {
    double u1 = uniform_dist_(rng_);
    double u2 = uniform_dist_(rng_);

    // Avoid log(0.0) undefined error
    if (u1 <= 1e-15)
      u1 = 1e-15;

    double z0 = std::sqrt(-2.0 * std::log(u1)) * std::cos(2.0 * M_PI * u2);
    return mean + z0 * stddev;
  }

  /**
   * Helper implementing Bernoulli trial for package drops.
   */
  bool should_drop_packet(double drop_rate) {
    return uniform_dist_(rng_) < drop_rate;
  }

  /**
   * Dynamically toggles faults based on JSON configurations received.
   */
  void config_callback(const std_msgs::msg::String::SharedPtr msg) {
    try {
      // Basic manual parse of JSON configuration toggles
      std::string data = msg->data;

      if (data.find("\"sensor_noise\":true") != std::string::npos) {
        sensor_noise_enabled_ = true;
        RCLCPP_INFO(this->get_logger(), "Config: Sensor noise ENABLED");
      } else if (data.find("\"sensor_noise\":false") != std::string::npos) {
        sensor_noise_enabled_ = false;
        RCLCPP_INFO(this->get_logger(), "Config: Sensor noise DISABLED");
      }

      if (data.find("\"packet_loss\":true") != std::string::npos) {
        packet_loss_enabled_ = true;
        RCLCPP_INFO(this->get_logger(), "Config: Packet loss ENABLED");
      } else if (data.find("\"packet_loss\":false") != std::string::npos) {
        packet_loss_enabled_ = false;
        RCLCPP_INFO(this->get_logger(), "Config: Packet loss DISABLED");
      }
    } catch (const std::exception &e) {
      RCLCPP_ERROR(this->get_logger(), "Error parsing configuration string: %s",
                   e.what());
    }
  }

  /**
   * LaserScan Callback: Intercepts scanner ranges, injecting Gaussian jitter.
   */
  void lidar_callback(const sensor_msgs::msg::LaserScan::SharedPtr msg) {
    // 1. Bernoulli trial package drop check
    if (packet_loss_enabled_ && should_drop_packet(packet_loss_rate_)) {
      RCLCPP_DEBUG(this->get_logger(),
                   "LIDAR Packet Dropped (Loss rate: %.1f%%)",
                   packet_loss_rate_ * 100);
      return; // Discard packet
    }

    auto out_msg = std::make_shared<sensor_msgs::msg::LaserScan>(*msg);

    // 2. Add Gaussian noise to laser ranges
    if (sensor_noise_enabled_) {
      for (size_t i = 0; i < out_msg->ranges.size(); ++i) {
        // Only apply noise to valid range readings
        if (out_msg->ranges[i] >= out_msg->range_min &&
            out_msg->ranges[i] <= out_msg->range_max) {
          double noise = generate_gaussian(0.0, sensor_noise_stddev_);
          out_msg->ranges[i] += static_cast<float>(noise);

          // Clamp values
          if (out_msg->ranges[i] < out_msg->range_min)
            out_msg->ranges[i] = out_msg->range_min;
          if (out_msg->ranges[i] > out_msg->range_max)
            out_msg->ranges[i] = out_msg->range_max;
        }
      }
    }

    lidar_pub_->publish(*out_msg);
  }

  /**
   * Pose/Odometry Callback: Intercepts position estimates, injecting systematic
   * drift.
   */
  void odom_callback(const geometry_msgs::msg::PoseStamped::SharedPtr msg) {
    if (packet_loss_enabled_ && should_drop_packet(packet_loss_rate_)) {
      RCLCPP_DEBUG(this->get_logger(), "Odometry Packet Dropped");
      return; // Discard packet
    }

    auto out_msg = std::make_shared<geometry_msgs::msg::PoseStamped>(*msg);

    // Inject drift/noise into vehicle coordinates estimation
    if (sensor_noise_enabled_) {
      out_msg->pose.position.x +=
          generate_gaussian(0.0, sensor_noise_stddev_ * 0.5);
      out_msg->pose.position.y +=
          generate_gaussian(0.0, sensor_noise_stddev_ * 0.5);
      out_msg->pose.position.z +=
          generate_gaussian(0.0, sensor_noise_stddev_ * 0.5);
    }

    odom_pub_->publish(*out_msg);
  }
};

int main(int argc, char **argv) {
  rclcpp::init(argc, argv);
  auto node = std::make_shared<NoiseInjectorNode>();
  rclcpp::spin(node);
  rclcpp::shutdown();
  return 0;
}
