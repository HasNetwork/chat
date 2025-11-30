from extensions import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

user_rooms = db.Table('user_rooms',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('room_name', db.String(100), db.ForeignKey('room.name'), primary_key=True)
)

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    online = db.Column(db.Boolean, default=False)
    rooms = db.relationship('Room', secondary=user_rooms, lazy='subquery',
                            backref=db.backref('users', lazy=True))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class MessageSeen(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)
    seen_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref=db.backref('seen_messages', lazy=True))
    message = db.relationship('Message', backref=db.backref('seen_by', lazy='dynamic'))

    # INDEX
    __table_args__ = (db.Index('idx_message_seen', 'message_id', 'user_id'),)

class Room(db.Model):
    name = db.Column(db.String(100), primary_key=True)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    room_name = db.Column(db.String(100), db.ForeignKey('room.name'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    username = db.Column(db.String(100), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    is_file = db.Column(db.Boolean, default=False)
    filename = db.Column(db.String(200), nullable=True)
    parent_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=True)
    is_deleted = db.Column(db.Boolean, default=False)
    edited_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', backref=db.backref('messages', lazy=True))
    room = db.relationship('Room', backref=db.backref('messages', lazy=True))
    replies = db.relationship('Message', backref=db.backref('parent', remote_side=[id]), lazy='dynamic')

    # INDEX
    __table_args__ = (db.Index('idx_message_room_time', 'room_name', 'timestamp'),)

class Reaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    emoji = db.Column(db.String(10), nullable=False)

    user = db.relationship('User', backref=db.backref('reactions', lazy=True))
    message = db.relationship('Message', backref=db.backref('reactions', lazy='dynamic', cascade="all, delete-orphan"))

    __table_args__ = (
        db.UniqueConstraint('message_id', 'user_id', 'emoji', name='_message_user_emoji_uc'),
        db.Index('idx_reaction_message', 'message_id'),
    )