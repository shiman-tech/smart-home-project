from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Initialize Flask app
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:root@localhost/smart_home'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

class User(db.Model):
    __tablename__ = 'users'
    user_id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(100), nullable=False, unique=True)
    password = db.Column(db.String(100), nullable=False)
    country_code = db.Column(db.String(10), nullable=False)
    phone_number = db.Column(db.String(15), nullable=False)
    rooms = db.relationship('Room', backref='user', lazy=True)

class Room(db.Model):
    __tablename__ = 'rooms'
    room_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'), nullable=False)
    room_name = db.Column(db.String(100), nullable=False)
    square_feet = db.Column(db.Integer, nullable=False)
    floor_number = db.Column(db.Integer, nullable=False)
    appliances = db.relationship('Appliance', backref='room', lazy=True)

class Appliance(db.Model):
    __tablename__ = 'appliances'
    appliance_id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.room_id'), nullable=False)
    appliance_name = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    min_power_rating_watt = db.Column(db.Integer, nullable=False)
    max_power_rating_watt = db.Column(db.Integer, nullable=False)
    readings = db.relationship('EnergyReading', backref='appliance', lazy=True)
    status = db.relationship('ApplianceStatus', backref='appliance', lazy=True, uselist=False)

class EnergyReading(db.Model):
    __tablename__ = 'energy_readings'
    reading_id = db.Column(db.Integer, primary_key=True)
    appliance_id = db.Column(db.Integer, db.ForeignKey('appliances.appliance_id'), nullable=False)
    current_power_watt = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class ApplianceStatus(db.Model):
    __tablename__ = 'appliance_status'
    status_id = db.Column(db.Integer, primary_key=True)
    appliance_id = db.Column(db.Integer, db.ForeignKey('appliances.appliance_id'), nullable=False)
    is_on = db.Column(db.Boolean, nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

def upgrade():
    # Create new tables
    db.create_all()
    
    # Add new columns to existing tables if needed
    try:
        # Add appliance_status table if it doesn't exist
        ApplianceStatus.__table__.create(db.engine)
        
        # Add energy_readings table if it doesn't exist
        EnergyReading.__table__.create(db.engine)
        
        print("Database upgraded successfully!")
    except Exception as e:
        print(f"Error upgrading database: {str(e)}")

if __name__ == '__main__':
    upgrade()
