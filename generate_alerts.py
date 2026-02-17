from models import db, User, Threshold_Levels
from app import app
from datetime import datetime

def generate_alerts():
    with app.app_context():
        # Get yesterday's date
        yesterday = datetime.date.today() - datetime.timedelta(days=1)
        start_ts = datetime.datetime(yesterday.year, yesterday.month, yesterday.day, 0, 0, 0)
        end_ts = datetime.datetime(yesterday.year, yesterday.month, yesterday.day, 23, 59, 59)
        
        # Get all users
        users = User.query.all()
        

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("Usage: python generate_alerts.py <user_id>")
        sys.exit(1)
    
    user_id = int(sys.argv[1])
    generate_alerts(user_id)
