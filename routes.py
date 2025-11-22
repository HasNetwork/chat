from flask import Blueprint, render_template, request, jsonify, send_from_directory, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.utils import secure_filename
import os
import uuid
import pytz
from datetime import datetime
from extensions import db
from models import User, Room, Message

bp = Blueprint('main', __name__)

IST = pytz.timezone('Asia/Kolkata')

# Create uploads directory if it doesn't exist
UPLOADS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
if not os.path.exists(UPLOADS_DIR):
    os.makedirs(UPLOADS_DIR)

@bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        remember = True if request.form.get('remember') else False
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user, remember=remember)
            return redirect(url_for('main.index'))
        else:
            flash('Invalid username or password')
    return render_template('login.html')

@bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.index'))
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if User.query.filter_by(username=username).first():
            flash('Username already exists')
        else:
            # Make the first registered user an admin
            is_admin = User.query.count() == 0
            new_user = User(username=username, is_admin=is_admin)
            new_user.set_password(password)
            db.session.add(new_user)
            db.session.commit()
            if is_admin:
                flash('Registration successful! You are now an admin. Please log in.')
            else:
                flash('Registration successful! Please log in.')
            return redirect(url_for('main.login'))
    return render_template('register.html')

@bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('main.login'))

# Serve static files from the 'uploads' directory
@bp.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOADS_DIR, filename)

@bp.route('/')
@login_required
def index():
    return render_template('index.html', rooms=[room.name for room in current_user.rooms], is_admin=current_user.is_admin)

@bp.route('/upload', methods=['POST'])
@login_required
def upload():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    room_name = request.form.get('room', 'general')
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file:
        original_filename = secure_filename(file.filename or "")
        unique_filename = str(uuid.uuid4()) + "_" + original_filename
        file_path = os.path.join(UPLOADS_DIR, unique_filename)
        file.save(file_path)
        
        file_url = f'/uploads/{unique_filename}'
        timestamp_ist = pytz.utc.localize(datetime.utcnow()).astimezone(IST)
        
        new_message = Message(
            room_name=room_name,
            user_id=current_user.id,
            username=current_user.username,
            content=file_url,
            is_file=True,
            filename=original_filename,
            timestamp=datetime.utcnow()
        )
        db.session.add(new_message)
        db.session.commit()

        # Emit socket event so clients receive the file message immediately
        from extensions import socketio
        socketio.emit('receive_message', {
            'id': new_message.id,
            'user': current_user.username,
            'message': file_url,
            'is_file': True,
            'filename': original_filename,
            'url': file_url,
            'timestamp': timestamp_ist.isoformat(),
            'parent_id': None,
            'is_deleted': False,
            'edited_at': None,
            'reactions': [],
            'seen_by': []
        }, to=room_name)
        
        return jsonify({'success': True, 'url': file_url})
    return jsonify({'error': 'File upload failed'}), 500

from functools import wraps

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            flash("You don't have permission to access this page.")
            return redirect(url_for('main.login'))
        return f(*args, **kwargs)
    return decorated_function

@bp.route('/admin')
@login_required
@admin_required
def admin():
    users = User.query.all()
    rooms = Room.query.all()
    files = []
    if os.path.exists(UPLOADS_DIR):
        for filename in os.listdir(UPLOADS_DIR):
            files.append(filename)
    return render_template('admin.html', users=users, rooms=rooms, files=files)

@bp.route('/admin/login_as/<int:user_id>')
@login_required
@admin_required
def login_as(user_id):
    user = User.query.get(user_id)
    if user:
        login_user(user)
        return redirect(url_for('main.index'))
    else:
        flash('User not found.')
        return redirect(url_for('main.admin'))

@bp.route('/admin/room/<room_name>/clear', methods=['POST'])
@login_required
@admin_required
def admin_clear_room(room_name):
    Message.query.filter_by(room_name=room_name).delete()
    db.session.commit()
    flash(f'Chat history for room "{room_name}" has been cleared.')
    return redirect(url_for('main.admin'))

@bp.route('/admin/room/<room_name>/delete', methods=['POST'])
@login_required
@admin_required
def admin_delete_room(room_name):
    room = Room.query.get(room_name)
    if room:
        # Delete file messages from the filesystem
        messages = Message.query.filter_by(room_name=room_name).all()
        for message in messages:
            if message.is_file:
                try:
                    file_path = os.path.join(UPLOADS_DIR, message.content.split('/')[-1])
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except Exception as e:
                    flash(f'Error deleting file for message {message.id}: {e}')
        
        # Delete messages in the room
        Message.query.filter_by(room_name=room_name).delete()
        
        # Delete room from user associations
        for user in room.users:
            user.rooms.remove(room)
            
        # Delete the room itself
        db.session.delete(room)
        db.session.commit()
        flash(f'Room "{room_name}" has been deleted.')
    else:
        flash(f'Room "{room_name}" not found.')
    return redirect(url_for('main.admin'))

@bp.route('/admin/room/<room_name>/remove_user/<int:user_id>', methods=['POST'])
@login_required
@admin_required
def admin_remove_user_from_room(room_name, user_id):
    room = Room.query.get(room_name)
    user = User.query.get(user_id)
    if room and user and user in room.users:
        room.users.remove(user)
        db.session.commit()
        flash(f'User {user.username} has been removed from room {room.name}.')
    else:
        flash('User or room not found, or user is not in the room.')
    return redirect(url_for('main.admin'))

@bp.route('/admin/file/<filename>/delete', methods=['POST'])
@login_required
@admin_required
def admin_delete_file(filename):
    try:
        # Delete the file from the filesystem
        file_path = os.path.join(UPLOADS_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Delete the message from the database
        file_url = f'/uploads/{filename}'
        Message.query.filter_by(content=file_url).delete()
        db.session.commit()
        
        flash(f'File "{filename}" has been deleted.')
    except Exception as e:
        flash(f'Error deleting file "{filename}": {e}')
    return redirect(url_for('main.admin'))
