from setuptools import find_packages, setup

package_name = 'swarm_manager'

setup(
    name=package_name,
    version='1.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='Robotics Software Engineer',
    maintainer_email='engineer@rover.sim',
    description='Swarm coordination and pathfinding algorithm sandbox node',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'pathfinder_node = swarm_manager.pathfinder_node:main',
            'collision_avoidance_node = swarm_manager.collision_avoidance_node:main'
        ],
    },
)
