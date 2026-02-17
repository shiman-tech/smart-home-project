import random
import datetime
import sys
from models import Appliance, Room, UsageLog
from database import get_session

def simulate_usage(user_id):
    session = None
    try:
        # Get database session
        session = get_session()
        
        # Get all appliances for this user
        appliances = session.query(Appliance).join(Room).filter(Room.user_id == user_id).all()
        
        if not appliances:
            print("No appliances found for user!")
            return False
            
        print(f"Found {len(appliances)} appliances for user {user_id}")
        
        # Generate data for the last 7 days
        today = datetime.datetime.now()
        for day in range(7):
            date = today - datetime.timedelta(days=day)
            print(f"Generating data for {date}")
            
            for appliance in appliances:
                # Generate random hours (1-10 hours)
                hours = random.uniform(1, 10)
                
                # Use appliance's actual power ratings if available
                min_power = appliance.min_power_rating_watt or 50
                max_power = appliance.max_power_rating_watt or 100
                power = random.uniform(min_power, max_power)
                    
                # Calculate energy consumption in kWh
                energy = (power * hours) / 1000
                
                # Create usage log
                usage_log = UsageLog(
                    appliance_id=appliance.appliance_id,
                    duration_hours=hours,
                    energy_consumed=energy,
                    timestamp=date.replace(hour=random.randint(0, 23), minute=random.randint(0, 59))
                )
                session.add(usage_log)
                print(f"Added log for {appliance.appliance_name}: {hours:.1f}h, {energy:.2f}kWh")
                
        # Commit all changes
        session.commit()
        print("Simulation complete!")
        return True
        
    except Exception as e:
        print(f"Error: {str(e)}")
        if session:
            session.rollback()
        return False
    finally:
        if session:
            session.close()

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python simulate_usage.py <user_id>")
        sys.exit(1)
    
    try:
        user_id = int(sys.argv[1])
        success = simulate_usage(user_id)
        sys.exit(0 if success else 1)
    except ValueError:
        print("Error: user_id must be a number")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
