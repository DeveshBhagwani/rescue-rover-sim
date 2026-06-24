cmake_minimum_required(VERSION 3.8)
project(fault_injection)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)
find_package(sensor_msgs REQUIRED)
find_package(geometry_msgs REQUIRED)

add_executable(noise_injector_node src/noise_injector_node.cpp)
target_link_libraries(noise_injector_node 
  rclcpp::rclcpp 
  std_msgs::std_msgs
  sensor_msgs::sensor_msgs
  geometry_msgs::geometry_msgs
)

install(TARGETS
  noise_injector_node
  DESTINATION lib/${PROJECT_NAME})

ament_package()
