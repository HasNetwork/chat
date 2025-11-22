# Flask Real-Time Chat Application

This is a real-time chat application built with Flask, Flask-SocketIO, and Flask-SQLAlchemy. It provides user authentication, multiple chat rooms, file sharing, and an admin panel for managing the application.

## Features

- **User Authentication:** Secure user registration and login system.
- **Admin Panel:** A powerful admin panel to manage users, rooms, and uploaded files.
- **Multiple Chat Rooms:** Users can create or join different chat rooms.
- **Real-Time Messaging:** Instant messaging powered by WebSockets.
- **File Sharing:** Users can upload and share files within chat rooms.
- **Chat History:** Previous messages are loaded when a user joins a room.
- **Admin Controls:** Admins can clear room history, delete rooms, and remove uploaded files.

## Technologies Used

- **Backend:**
  - Flask
  - Flask-SocketIO
  - Flask-SQLAlchemy
  - Flask-Login
  - eventlet
- **Frontend:**
  - HTML
  - Tailwind CSS
  - JavaScript (with Socket.IO client)
- **Database:**
  - SQLite

## Setup and Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Hashah2311/chat.git
    cd chat
    ```

2.  **Create a virtual environment:**

    ```bash
    python -m venv env
    ```

3.  **Activate the virtual environment:**

    - **Windows:**
      ```bash
      .\env\Scripts\activate
      ```
    - **macOS/Linux:**
      ```bash
      source env/bin/activate
      ```

4.  **Install the dependencies:**

    ```bash
    pip install -r requirements.txt
    ```

5.  **Run the application:**
    ```bash
    python app.py
    ```
    The application will be running at `http://127.0.0.1:5000`.

## Database Migration

If you are upgrading from an older version of the application and have an existing `old_chat.db` file:

1.  Place `old_chat.db` in the root directory of the project.
2.  Run the migration script:
    ```bash
    python migrate_db.py
    ```
3.  This will import users and messages into the new `instance/chat.db`.

## Admin Panel

The first user to register becomes an admin. The admin panel can be accessed at the `/admin` route.

### Admin Features:

- **View Users:** See a list of all registered users.
- **Login As User:** Admins can log in as any user to view the application from their perspective.
- **Manage Rooms:**
  - **Clear History:** Clear all messages from a specific room.
  - **Delete Room:** Delete a room and all its associated messages and files.
- **Manage Files:** View and delete all uploaded files.

## Usage

1. **Register a new account.** The first account created will have admin privileges.
2. **Log in** with your credentials.
3. **Create or join a room** to start chatting.
4. **Use the admin panel** (if you are an admin) to manage users, rooms, and files.

## File Structure

```
.
├── app.py              # Main Flask application file
├── requirements.txt    # Python dependencies
├── instance/
│   └── chat.db         # SQLite database file
├── templates/
│   ├── admin.html      # Admin panel template
│   ├── index.html      # Main chat page template
│   ├── login.html      # Login page template
│   └── register.html   # Registration page template
└── uploads/            # Directory for uploaded files
```
