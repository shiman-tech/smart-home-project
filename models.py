from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

Base = declarative_base()

class User(Base, UserMixin):
    __tablename__ = 'users'
    user_id = Column(Integer, primary_key=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    email = Column(String(120), unique=True, nullable=False)
    password = Column(String(100), nullable=False)
    country_code = Column(String(10))
    phone_number = Column(String(20))
    security_question = Column(String(200), nullable=False)
    security_answer = Column(String(100), nullable=False)
    
    rooms = relationship('Room', back_populates='user', cascade='all, delete-orphan')
    threshold_levels = relationship('ThresholdLevels', back_populates='user', cascade='all, delete-orphan')
    threshold_alerts = relationship('ThresholdAlerts', back_populates='user', cascade='all, delete-orphan')

    def __init__(self, email, password, first_name, last_name, security_question, security_answer, country_code=None, phone_number=None):
        self.email = email
        self.password = generate_password_hash(password)
        self.first_name = first_name
        self.last_name = last_name
        self.security_question = security_question
        self.security_answer = generate_password_hash(security_answer)  # Store hashed answer for security
        self.country_code = country_code
        self.phone_number = phone_number

    def get_id(self):
        return str(self.user_id)

    def is_active(self):
        return True

    def is_authenticated(self):
        return True

    def is_anonymous(self):
        return False

    def check_password(self, password):
        return check_password_hash(self.password, password)

    def check_security_answer(self, answer):
        return check_password_hash(self.security_answer, answer)

class Room(Base):
    __tablename__ = 'rooms'
    room_id = Column(Integer, primary_key=True)
    room_name = Column(String(50), nullable=False)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    
    user = relationship('User', back_populates='rooms')
    appliances = relationship('Appliance', back_populates='room', cascade='all, delete-orphan')

class Appliance(Base):
    __tablename__ = 'appliances'
    appliance_id = Column(Integer, primary_key=True)
    appliance_name = Column(String(50), nullable=False)
    min_power_rating_watt = Column(Float, default=0)
    max_power_rating_watt = Column(Float, nullable=False)
    quantity = Column(Integer, default=1)
    room_id = Column(Integer, ForeignKey('rooms.room_id'), nullable=False)
    
    room = relationship('Room', back_populates='appliances')
    usage_logs = relationship('UsageLog', back_populates='appliance', cascade='all, delete-orphan')

class UsageLog(Base):
    __tablename__ = 'usage_logs'
    log_id = Column(Integer, primary_key=True)
    appliance_id = Column(Integer, ForeignKey('appliances.appliance_id'), nullable=False)
    energy_consumed = Column(Float, nullable=False)
    duration_hours = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    appliance = relationship('Appliance', back_populates='usage_logs')

class ThresholdLevels(Base):
    __tablename__ = 'threshold_levels'
    level_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    warning_kwh = Column(Float, nullable=False)
    critical_kwh = Column(Float, nullable=False)
    
    user = relationship('User', back_populates='threshold_levels')

class ThresholdAlerts(Base):
    __tablename__ = 'threshold_alerts'
    alert_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
    level_id = Column(String(20), nullable=False)  # 'Warning' or 'Critical'
    alert_date = Column(DateTime, default=datetime.utcnow)
    current_kwh = Column(Float, nullable=False)
    
    user = relationship('User', back_populates='threshold_alerts')
