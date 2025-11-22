import sqlite3
import os
from app import app
from extensions import db
from models import User, Room, Message
from datetime import datetime

# Configuration
OLD_DB_PATH = 'old_chat.db' # Path to the old database file
NEW_DB_PATH = 'new_chat.db' # Path to the new database file (managed by app)

def migrate():
    if not os.path.exists(OLD_DB_PATH):
        print(f"Error: Old database file '{OLD_DB_PATH}' not found.")
        return

    print(f"Migrating from '{OLD_DB_PATH}'...")

    # Connect to old database
    old_conn = sqlite3.connect(OLD_DB_PATH)
    old_cursor = old_conn.cursor()

    with app.app_context():
        # Create tables if they don't exist
        db.create_all()

        # 1. Migrate Users
        print("Migrating Users...")
        try:
            # Assuming old User table had: id, username, password_hash, is_admin
            old_cursor.execute("SELECT id, username, password_hash, is_admin FROM user")
            old_users = old_cursor.fetchall()

            for row in old_users:
                old_id, username, password_hash, is_admin = row
                
                # Check if user already exists
                if not User.query.filter_by(username=username).first():
                    new_user = User(
                        username=username,
                        password_hash=password_hash,
                        is_admin=bool(is_admin),
                        online=False, # Default
                        last_seen=datetime.utcnow() # Default
                    )
                    db.session.add(new_user)
            
            db.session.commit()
            print(f"Migrated {len(old_users)} users.")
        except Exception as e:
            print(f"Error migrating users: {e}")
            db.session.rollback()

        # 2. Migrate Messages (and create Rooms implicitly)
        print("Migrating Messages...")
        try:
            # Assuming old Message table had: id, content, timestamp, user_id, room_name
            # Note: Adjust column names if they were different in the old DB
            old_cursor.execute("SELECT user_id, room_name, content, timestamp FROM message")
            old_messages = old_cursor.fetchall()

            count = 0
            for row in old_messages:
                old_user_id, room_name, content, timestamp_str = row

                # Ensure Room exists
                room = Room.query.get(room_name)
                if not room:
                    room = Room(name=room_name)
                    db.session.add(room)
                    db.session.commit() # Commit room creation immediately

                # Get User (we need to map old user_id to new user object, but since we migrated users by username, we can lookup by username if IDs changed, or just trust the ID if we preserved order. 
                # Better: Lookup user by username from the old DB to get the new User object)
                
                # Fetch username for the old_user_id
                old_cursor.execute("SELECT username FROM user WHERE id = ?", (old_user_id,))
                user_row = old_cursor.fetchone()
                if user_row:
                    username = user_row[0]
                    user = User.query.filter_by(username=username).first()
                    
                    if user:
                        # Parse timestamp
                        try:
                            # Try parsing common formats
                            if isinstance(timestamp_str, str):
                                timestamp = datetime.fromisoformat(timestamp_str)
                            else:
                                timestamp = datetime.utcnow() # Fallback
                        except:
                            timestamp = datetime.utcnow()

                        new_message = Message(
                            room_name=room_name,
                            user_id=user.id,
                            username=user.username,
                            content=content,
                            timestamp=timestamp,
                            is_file=False, # Default
                            is_deleted=False, # Default
                            reactions=[] # Default
                        )
                        db.session.add(new_message)
                        count += 1
            
            db.session.commit()
            print(f"Migrated {count} messages.")

        except Exception as e:
            print(f"Error migrating messages: {e}")
            db.session.rollback()

    old_conn.close()
    os.system(f"copy {OLD_DB_PATH} {NEW_DB_PATH}")
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
