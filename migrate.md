Database Migration Guide
========================

To migrate your existing database to the new schema, follow these steps:

1.  **Install Dependencies**
    Ensure all required packages are installed:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Prepare Database**
    Place your existing `chat.db` file in the `instance/` directory.
    If the directory does not exist, create it:
    ```bash
    mkdir -p instance
    cp /path/to/your/old/chat.db instance/chat.db
    ```

3.  **Run Migration**
    Apply the migration script to update the database schema:
    ```bash
    flask db upgrade
    ```

    This command will detect the current state of your database and apply necessary changes (adding new columns like `last_seen`, `online`, `is_deleted`, etc.) without losing your existing data.

4.  **Verify**
    You can now run the application:
    ```bash
    python app.py
    ```
