from sqlalchemy import create_engine
from models import Base

def init_db():
    engine = create_engine('sqlite:///smart_home.db')
    Base.metadata.create_all(engine)
    print("Database initialized successfully!")

if __name__ == '__main__':
    init_db()
    print("Database created with security fields")
