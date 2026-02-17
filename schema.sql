CREATE DATABASE smart_home;
USE smart_home;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS threshold_alerts;
DROP TABLE IF EXISTS threshold_levels;
DROP TABLE IF EXISTS usage_logs;
DROP TABLE IF EXISTS appliances;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(100),
    country_code VARCHAR(10),
    phone_number VARCHAR(15)
);

-- Create rooms table
CREATE TABLE rooms (
    room_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    room_name VARCHAR(100),
    square_feet INTEGER,
    floor_number INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create appliances table
CREATE TABLE appliances (
    appliance_id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    appliance_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    min_power_rating_watt INTEGER NOT NULL,
    max_power_rating_watt INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(room_id)
);

-- Create usage_logs table
CREATE TABLE usage_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    appliance_id INTEGER,
    duration_hours FLOAT,
    energy_consumed FLOAT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appliance_id) REFERENCES appliances(appliance_id)
);

-- Create threshold_levels table
CREATE TABLE threshold_levels (
    level_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    warning_kwh FLOAT NOT NULL,
    critical_kwh FLOAT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Create threshold_alerts table
CREATE TABLE threshold_alerts (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    level_id VARCHAR(20) NOT NULL,
    current_kwh FLOAT NOT NULL,
    alert_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Insert predefined threshold levels
INSERT INTO threshold_levels VALUES
    (1, 1, 30, 35),
    (2, 1, 30, 35),
    (3, 1, 30, 35);

