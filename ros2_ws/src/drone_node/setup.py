from setuptools import find_packages, setup

package_name = 'drone_node'

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
    description='Aerial SLAM mapping and flight dynamics simulation node',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'drone_node = drone_node.drone_node:main'
        ],
    },
)
