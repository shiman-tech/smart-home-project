from database import get_session
from models import User
import os

def check_users():
    print("\nDatabase Check Utility")
    print("=" * 50)
    
    # First check if database exists
    if not os.path.exists('smart_home.db'):
        print("ERROR: Database file 'smart_home.db' does not exist!")
        return
    
    print("Database file exists")
    session = get_session()
    
    try:
        # Try to query users
        print("\nAttempting to query users table...")
        users = session.query(User).all()
        
        if users:
            print(f"\nSuccessfully found {len(users)} registered users:")
            print("-" * 50)
            
            for user in users:
                print(f"  User ID: {user.user_id}")
                print(f"  Name: {user.first_name} {user.last_name}")
                print(f"  Email: {user.email}")
                print(f"  Password: {user.password}")
                print(f"  Country Code: {user.country_code}")
                print(f"  Phone: {user.phone_number}")
                print("-" * 50)
        else:
            print("No users found in database")
    except Exception as e:
        print(f"\nERROR checking users: {str(e)}")
        print(f"Exception type: {type(e).__name__}")
        print(f"Exception details: {str(e)}")
    finally:
        print("\nClosing database connection...")
        session.close()

if __name__ == "__main__":
    check_users()