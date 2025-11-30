import eventlet
eventlet.monkey_patch()
from flask import Flask
from extensions import db, socketio, login_manager, migrate
from models import User
# Import blueprint LAST to avoid circular imports
from routes import bp as main_bp

def create_app():
    app = Flask(__name__, static_folder='static')
    app.config['SECRET_KEY'] = 'a_very_secret_key'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///chat.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    
    # CRITICAL: Optimized for Cloudflare + Termux using Eventlet
    # ping_interval=5 keeps the Cloudflare tunnel alive
    socketio.init_app(app, 
        async_mode='eventlet', 
        cors_allowed_origins="*",
        ping_timeout=15, 
        ping_interval=5
    )
    
    login_manager.init_app(app)
    login_manager.login_view = 'main.login'

    # Register blueprints
    app.register_blueprint(main_bp)

    return app

app = create_app()

# Import events to register socket handlers
import events 

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    # Local dev run
    socketio.run(app, host='0.0.0.0', port=5000)