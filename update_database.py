from flask_sqlalchemy import SQLAlchemy
from models import db
from app import app

with app.app_context():
    # Drop all tables
    db.drop_all()
    # Create all tables
    db.create_all()
    print("Database updated successfully!")
