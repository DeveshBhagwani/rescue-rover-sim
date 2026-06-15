cmake_minimum_required(VERSION 3.8)
project(kinematics_node)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)

add_executable(kinematics_node src/kinematics_node.cpp)
target_link_libraries(kinematics_node rclcpp::rclcpp std_msgs::std_msgs)

install(TARGETS
  kinematics_node
  DESTINATION lib/${PROJECT_NAME})

ament_package()
