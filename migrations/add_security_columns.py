import sqlite3
import os

def migrate():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'smart_home.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Add security_question column
        cursor.execute('''
            ALTER TABLE users 
            ADD COLUMN security_question TEXT NOT NULL 
            DEFAULT ''
        ''')
        
        # Add security_answer column
        cursor.execute('''
            ALTER TABLE users 
            ADD COLUMN security_answer TEXT NOT NULL 
            DEFAULT ''
        ''')
        
        conn.commit()
        print("Migration completed successfully!")
    except sqlite3.Error as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
