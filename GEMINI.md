# Current Session Context

**Project Phase:** Refactoring & Polish Complete
**Last Action:** Mobile UI optimization and Database Migration script creation.

## 🚧 Active Focus

User verification of the mobile UI and execution of the migration script. The application is currently stable and feature-complete based on recent requests.

## ⚠️ Known Issues / Constraints

## ⚠️ Known Issues / Constraints

- **Mobile:** Sidebar is hidden by default on mobile and toggled via a hamburger menu.
- **Timezones:** Client-side timestamps are forced to IST ("Asia/Kolkata").

# Project Summary

This project is a real-time, multi-user, multi-room chat application. The backend is built with **Python (Flask-SocketIO)** and the frontend is a single, responsive **HTML file styled with Tailwind CSS**.

### **Technology Stack**

- **Backend:** Flask, Flask-SocketIO, Flask-Login, Flask-SQLAlchemy
- **Database:** SQLite (for users, rooms, and persistent message history)
- **Frontend:** Single HTML file, Tailwind CSS (via CDN), Socket.IO-client.js
- **Python Libraries:** pytz (for timezone conversion), uuid (for unique filenames)

### **Key Features**

- **User Authentication:** Full login (login.html) and registration (register.html) system using Flask-Login. Routes are protected.
- **Persistent Chat Rooms:** Users can create new chat rooms or join existing ones. A user's room list is saved to the database.
- **Database History:** All messages (text and file links) are saved to an SQLite database (chat.db), so history is persistent across server restarts.
- **Efficient History Loading:** When a user joins a room, the _entire_ chat history for that room is sent in a single load_history event (as a JSON array) to avoid performance issues.
- **Secure File Uploads:** Users can upload files. To prevent overwrites, files are saved on the server with a uuid prefixed to the original filename.
- **Rich UI & Timestamps:**
  - The UI is a **dark theme** (using Tailwind).
  - Messages display the sender's username and a time (e.g., "19:32").
  - All timestamps are converted to and displayed in **IST** (Asia/Kolkata).
  - Date separators (e.g., "October 27, 2025") are automatically inserted between messages from different days.
  - File upload notifications are styled as large, distinct chat bubbles within the chat flow.
- **Mobile Optimized:** Fully responsive layout with a hamburger menu for the sidebar and card-based views for admin tables on mobile.

### **Development History & Key Context**

The development process was highly iterative and involved fixing several critical bugs and performance issues identified by the user:

1. **Initial Build:** A simple, single-room chat with basic text and file link broadcasting.
2. **Major Feature Add:** The user requested authentication, chat rooms, and persistent DB history. This was a complex update.
3. **Bug Fix (Routing):** The assistant's initial attempt to add these features failed, resulting in a BuildError: Could not build url for endpoint 'logout'. This was because the index.html file was updated to link to a /logout route that the app.py file was missing. This was eventually fixed by applying the full auth code to app.py.
4. **Bug Fix (File Overwrites):** The user pointed out that two files with the same name (e.g., report.pdf) would overwrite each other. This was solved by using uuid to generate unique filenames.
5. **Performance Fix (History Load):** The user identified a major performance bottleneck: the on_join handler was emitting thousands of individual socket events (one for each message in the history). This was refactored to send the entire history in a single batch.
6. **UI/UX Polish:** The user then requested timestamps, date separators, conversion to IST, removal of "user joined" messages, a full dark theme, and custom styling for file upload messages.
7. **Mobile Optimization:** Addressed layout overflow issues, added a sidebar toggle, and optimized the Admin page for mobile devices.
8. **Refactoring:** Split `app.py` into modular components (`models.py`, `routes.py`, `events.py`, `extensions.py`) and extracted JavaScript to `static/js/chat.js`.

### **Summary of Core Prompts & User Feedback**

- "Build a complete, real-time chat application with Flask-SocketIO and a single HTML/Tailwind file. Must support text messaging and file sharing (uploading and broadcasting a link)."
- "Add login functionality, chat rooms, and persistent chat history (using a database) so messages are not lost on server restart."
- (Concern 1): "Fix file overwrites. Two users uploading 'report.pdf' will overwrite each other." (Solution: Use UUIDs).
- (Concern 2): "The on_join handler is inefficient. It emits every history message one by one. Fix this." (Solution: Send history in a single batch).
- (Concern 3): "Add timestamps to messages, with date separators for different days, and show the time (e.g., 19:32) on each message."
- "Convert the timestamps to IST and remove the 'user has joined the room' message."
- "Convert the entire interface (login, register, and chat pages) to a dark theme."
- "Restyle the file upload notification to look like a chat message, but make it vertically larger and distinct."
- "Fix mobile layout overflow and make the Admin page responsive."
