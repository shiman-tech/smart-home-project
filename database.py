from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, scoped_session
import os

# Get the absolute path of the current directory
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, 'smart_home.db')

# Create engine with proper configuration
engine = create_engine(
    f'sqlite:///{DB_PATH}',
    connect_args={'check_same_thread': False},
    pool_pre_ping=True,
    echo=False
)

# Create session factory
session_factory = sessionmaker(bind=engine)
Session = scoped_session(session_factory)

def get_session():
    """Get a new database session"""
    return session_factory()

def remove_session():
    """Remove the session"""
    session = get_session()
    if session:
        session.close()



def initialize_database():
    """Initialize the database by creating all tables"""
    print(f"Using database at: {DB_PATH}")
    
    # Import models here to avoid circular imports
    from models import Base, User, Room, Appliance, UsageLog, ThresholdLevels, ThresholdAlerts
    
    # Create tables only if they don't exist
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    if not existing_tables:
        print("No existing tables found. Creating new tables...")
        Base.metadata.create_all(engine)
        print("Database tables created successfully!")
    else:
        print(f"Found existing tables: {', '.join(existing_tables)}")

def recreate_tables():
    """Drop all tables and recreate them - USE WITH CAUTION"""
    from models import Base
    print(f"Recreating all tables in database at: {DB_PATH}")
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    print("Database tables recreated successfully!")

def init_db():
    from models import Base
    Base.metadata.create_all(engine)
    print("Database initialized successfully!")

if __name__ == '__main__':
    init_db()
    print("Database created with security fields")
    initialize_database()
