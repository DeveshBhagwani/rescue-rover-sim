cmake_minimum_required(VERSION 3.8)
project(control_node)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)

add_executable(control_node src/control_node.cpp)
target_link_libraries(control_node rclcpp::rclcpp std_msgs::std_msgs)

install(TARGETS
  control_node
  DESTINATION lib/${PROJECT_NAME})

ament_package()
