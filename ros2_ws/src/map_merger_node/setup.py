from setuptools import find_packages, setup

package_name = 'map_merger_node'

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
    description='SLAM map grid fusion node',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'map_merger_node = map_merger_node.map_merger_node:main'
        ],
    },
)
