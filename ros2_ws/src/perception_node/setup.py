from setuptools import find_packages, setup

package_name = 'perception_node'

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
    maintainer='engineer',
    maintainer_email='engineer@rover.sim',
    description='Vision and Sensor Fusion Node for RescueRover Sim',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'perception_node = perception_node.perception_node:main'
        ],
    },
)
