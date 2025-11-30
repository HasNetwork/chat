from flask import request
from flask_socketio import emit, join_room, leave_room
from flask_login import current_user
from datetime import datetime
from sqlalchemy.orm import joinedload
from extensions import db, socketio
from models import User, Room, Message, Reaction, MessageSeen

def emit_user_status(room_name):
    room = Room.query.get(room_name)
    if room:
        online_users = [user.username for user in room.users if user.online]
        emit('user_status', {'online_users': online_users}, to=room_name)

@socketio.on('connect')
def on_connect():
    if current_user.is_authenticated:
        current_user.online = True
        current_user.last_seen = datetime.utcnow()
        db.session.commit()

@socketio.on('disconnect')
def on_disconnect():
    if current_user.is_authenticated:
        current_user.online = False
        current_user.last_seen = datetime.utcnow()
        db.session.commit()
        for room in current_user.rooms:
            emit_user_status(room.name)

@socketio.on('join')
def on_join(data):
    room_name = data['room']
    join_room(room_name)

    room = Room.query.get(room_name)
    if not room:
        room = Room(name=room_name)
        db.session.add(room)
    
    if room not in current_user.rooms:
        current_user.rooms.append(room)
        db.session.commit()

    # --- PERFORMANCE FIX START ---
    # Fetch messages + Reactions + Seen status in ONE query.
    history_messages = Message.query.options(
        joinedload(Message.reactions).joinedload(Reaction.user),
        joinedload(Message.seen_by).joinedload(MessageSeen.user)
    ).filter_by(room_name=room_name).order_by(Message.timestamp.desc()).limit(50).all()
    # --- PERFORMANCE FIX END ---

    # Reverse to show oldest first
    history_messages = history_messages[::-1]

    history_batch = [{
        'id': msg.id,
        'user': msg.username,
        'message': msg.content,
        'is_file': msg.is_file,
        'filename': msg.filename,
        'url': msg.content if msg.is_file else None,
        'timestamp': msg.timestamp.isoformat() + "Z", # Send UTC
        'parent_id': msg.parent_id,
        'is_deleted': msg.is_deleted,
        'edited_at': msg.edited_at.isoformat() + "Z" if msg.edited_at else None,
        'reactions': [{'emoji': r.emoji, 'user': r.user.username} for r in msg.reactions],
        'seen_by': [seen.user.username for seen in msg.seen_by]
    } for msg in history_messages]
    
    emit('load_history', history_batch)
    emit_user_status(room_name)

@socketio.on('send_message')
def handle_send_message(data):
    room_name = data['room']
    message_content = data['message']
    parent_id = data.get('parent_id')
    
    new_message = Message(
        room_name=room_name,
        user_id=current_user.id,
        username=current_user.username,
        content=message_content,
        parent_id=parent_id
    )
    db.session.add(new_message)
    db.session.commit()

    emit('receive_message', {
        'id': new_message.id,
        'user': current_user.username,
        'message': message_content,
        'is_file': False,
        'timestamp': new_message.timestamp.isoformat() + "Z",
        'parent_id': parent_id,
        'is_deleted': False,
        'edited_at': None,
        'reactions': []
    }, to=room_name)

@socketio.on('edit_message')
def handle_edit_message(data):
    message_id = data['message_id']
    new_content = data['new_content']
    message = Message.query.get(message_id)
    if message and message.user_id == current_user.id:
        message.content = new_content
        message.edited_at = datetime.utcnow()
        db.session.commit()
        
        emit('message_edited', {
            'message_id': message_id,
            'new_content': new_content,
            'edited_at': message.edited_at.isoformat() + "Z"
        }, to=message.room_name)

@socketio.on('delete_message')
def handle_delete_message(data):
    message_id = data['message_id']
    message = Message.query.get(message_id)
    if message and message.user_id == current_user.id:
        message.is_deleted = True
        db.session.commit()
        emit('message_deleted', {'message_id': message_id}, to=message.room_name)

@socketio.on('react_message')
def handle_react_message(data):
    message_id = data['message_id']
    emoji = data['emoji']
    
    existing_reaction = Reaction.query.filter_by(message_id=message_id, user_id=current_user.id).first()
    if existing_reaction:
        db.session.delete(existing_reaction)

    new_reaction = Reaction(message_id=message_id, user_id=current_user.id, emoji=emoji)
    db.session.add(new_reaction)
    db.session.commit()
    
    # Reload with joined data
    message = Message.query.options(joinedload(Message.reactions).joinedload(Reaction.user)).get(message_id)
    reactions = [{'emoji': r.emoji, 'user': r.user.username} for r in message.reactions]

    emit('message_reacted', {
        'message_id': message_id,
        'reactions': reactions
    }, to=message.room_name)

@socketio.on('typing')
def handle_typing(data):
    emit('typing', {
        'user': current_user.username,
        'is_typing': data['is_typing']
    }, to=data['room'], include_self=False)

@socketio.on('message_seen')
def handle_message_seen(data):
    message_id = data['message_id']
    # Check efficiently without full load
    seen_exists = db.session.query(MessageSeen.id).filter_by(user_id=current_user.id, message_id=message_id).scalar()
    
    if not seen_exists:
        seen = MessageSeen(user_id=current_user.id, message_id=message_id)
        db.session.add(seen)
        try:
            db.session.commit()
        except:
            db.session.rollback()

        # Efficient fetch of usernames
        seen_users = db.session.query(User.username).join(MessageSeen).filter(MessageSeen.message_id == message_id).all()
        seen_by_users = [u[0] for u in seen_users]
        
        emit('message_seen_by', {
            'message_id': message_id,
            'seen_by': seen_by_users
        }, to=db.session.query(Message.room_name).filter_by(id=message_id).scalar())