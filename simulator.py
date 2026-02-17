import random
import datetime
from datetime import timedelta
import json
import os

class EnergySimulator:
    def __init__(self):
        # Load appliance data from JSON
        self.appliances = self._load_appliance_data()
        self.current_time = datetime.datetime.now()
        
    def _load_appliance_data(self):
        """Load appliance data with typical power ratings and usage patterns"""
        return {
            'refrigerator': {
                'min_power': 100,  # watts
                'max_power': 200,
                'usage_pattern': 'constant',
                'description': 'Runs continuously'
            },
            'air_conditioner': {
                'min_power': 1000,
                'max_power': 2000,
                'usage_pattern': 'daily',
                'description': 'High usage during hot hours'
            },
            'washing_machine': {
                'min_power': 500,
                'max_power': 1000,
                'usage_pattern': 'weekly',
                'description': 'High usage during laundry days'
            },
            'television': {
                'min_power': 50,
                'max_power': 200,
                'usage_pattern': 'daily',
                'description': 'Evening usage'
            },
            'computer': {
                'min_power': 100,
                'max_power': 300,
                'usage_pattern': 'daily',
                'description': 'Work hours usage'
            }
        }
    
    def generate_energy_reading(self, appliance_name):
        """Generate a simulated energy reading for an appliance"""
        if appliance_name not in self.appliances:
            return None
            
        appliance = self.appliances[appliance_name]
        power = random.uniform(appliance['min_power'], appliance['max_power'])
        return {
            'power_watt': power,
            'timestamp': self.current_time.strftime('%Y-%m-%d %H:%M:%S'),
            'appliance_name': appliance_name,
            'description': appliance['description']
        }
    
    def generate_room_data(self, room_name, appliances):
        """Generate simulated data for a room with multiple appliances"""
        readings = []
        for appliance in appliances:
            reading = self.generate_energy_reading(appliance)
            if reading:
                readings.append({
                    'room_name': room_name,
                    'appliance': reading
                })
        return readings
    
    def generate_daily_usage(self, room_name, appliances):
        """Generate a day's worth of simulated readings"""
        readings = []
        for hour in range(24):
            self.current_time = datetime.datetime.now().replace(hour=hour, minute=0, second=0)
            room_data = self.generate_room_data(room_name, appliances)
            readings.extend(room_data)
        return readings
    
    def generate_monthly_usage(self, room_name, appliances):
        """Generate a month's worth of simulated readings"""
        readings = []
        for day in range(30):
            self.current_time = datetime.datetime.now() + timedelta(days=day)
            daily_readings = self.generate_daily_usage(room_name, appliances)
            readings.extend(daily_readings)
        return readings

# Initialize simulator
simulator = EnergySimulator()
