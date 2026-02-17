from database import get_session
from models import User, Room, Appliance, UsageLog

def check_database():
    session = get_session()
    try:
        print("\nChecking database contents...")
        
        # Check users
        users = session.query(User).all()
        print(f"\nUsers in database: {len(users)}")
        for user in users:
            print(f"User ID: {user.user_id}, Email: {user.email}")
            
        # Check rooms
        rooms = session.query(Room).all()
        print(f"\nRooms in database: {len(rooms)}")
        for room in rooms:
            print(f"Room ID: {room.room_id}, Name: {room.room_name}, User ID: {room.user_id}")
            
        # Check appliances
        appliances = session.query(Appliance).all()
        print(f"\nAppliances in database: {len(appliances)}")
        for appliance in appliances:
            print(f"Appliance ID: {appliance.appliance_id}, Name: {appliance.appliance_name}, Room ID: {appliance.room_id}")
            
        # Check usage logs
        usage_logs = session.query(UsageLog).all()
        print(f"\nUsage Logs in database: {len(usage_logs)}")
        for log in usage_logs[:5]:  # Show first 5 logs
            print(f"Log ID: {log.log_id}, Appliance ID: {log.appliance_id}, Energy: {log.energy_consumed}, Time: {log.timestamp}")
            
    except Exception as e:
        print(f"Error checking database: {str(e)}")
    finally:
        session.close()

if __name__ == '__main__':
    check_database()
