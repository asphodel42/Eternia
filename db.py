from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship, sessionmaker, joinedload
from datetime import datetime

# Initializing objects SQLAlchemy and Bcrypt
db = SQLAlchemy()
bcrypt = Bcrypt()

# Setting database
DATABASE_URL = "mysql+pymysql://asphodel:42@localhost/eternia_db"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

Base = db.Model 

# ~~~ Database models
class User(Base):
    """User model"""
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False, unique=True)
    email = Column(String(100), nullable=False, unique=True)
    password = Column(String(200), nullable=False)

    # Відношення з чатами
    chats_as_user1 = relationship('Chat', backref='user1', foreign_keys='Chat.user1_id')
    chats_as_user2 = relationship('Chat', backref='user2', foreign_keys='Chat.user2_id')

    def __init__(self, username, email, password):
        self.username = username
        self.email = email
        self.password = bcrypt.generate_password_hash(password).decode('utf-8')  # Хешуємо пароль

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)  # Перевірка пароля

class Chat(Base):
    """Chat model"""
    __tablename__ = 'chats'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user1_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    user2_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    
    # Відношення з повідомленнями
    messages = relationship('Message', backref='chat', lazy=True)

    def __init__(self, user1_id, user2_id):
        self.user1_id = user1_id
        self.user2_id = user2_id

class Message(Base):
    """Message model"""
    __tablename__ = 'messages'

    id = Column(Integer, primary_key=True, autoincrement=True)
    chat_id = Column(Integer, ForeignKey('chats.id'), nullable=False)
    sender_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    content = Column(String(500), nullable=False)
    timestamp = Column(DateTime, default=datetime.now())

    def __init__(self, chat_id, sender_id, content, timestamp):
        self.chat_id = chat_id
        self.sender_id = sender_id
        self.content = content
        self.timestamp = timestamp

def init_db():
    """Initializes the database and creates tables."""
    Base.metadata.create_all(engine)


# Function for creating a user
def create_user(username, email, password):
    """Adding a new user to the database."""
    session = Session()
    try:
        if session.query(User).filter((User.username == username) | (User.email == email)).first():
            return False
        new_user = User(username=username, email=email, password=password)
        session.add(new_user)
        session.commit()
        return True
    except Exception as e:
        print(f"Error creating user: {e}")
        return False
    finally:
        session.close()


# Function for verifying user data during login
def verify_user_credentials(email, password):
    """Verification of user data during login."""
    session = Session()
    try:
        user = session.query(User).filter(User.email == email).first()
        if user and bcrypt.check_password_hash(user.password, password):
            return True
        return False
    except Exception as e:
        print(f"Error verifying credentials: {e}")
        return False
    finally:
        session.close()

def get_user_by_email(email):
    """Getting user by email."""
    session = Session()
    try:
        # Отримуємо користувача по email
        user = session.query(User).filter(User.email == email).first()
        return user
    except Exception as e:
        print(f"Error getting user by email: {e}")
        return None
    finally:
        session.close()

def get_user_by_id(user_id):
    """Getting user by id."""
    session = Session()
    try:
        return session.query(User).filter_by(id=user_id).first()
    except Exception as e:
        print(f"Error retrieving user by ID: {e}")
        return None
    finally:
        session.close()

# Function for adding a chat
def add_chat(user1_id, user2_id):
    """Add a chat between two users if it doesn't exist."""
    session = Session()
    try:
        # Check if the chat already exists
        existing_chat = session.query(Chat).filter(
            ((Chat.user1_id == user1_id) & (Chat.user2_id == user2_id)) |
            ((Chat.user1_id == user2_id) & (Chat.user2_id == user1_id))
        ).first()

        if existing_chat:
            return existing_chat.id

        # Create a new chat
        new_chat = Chat(user1_id=user1_id, user2_id=user2_id)
        session.add(new_chat)
        session.commit()
        return new_chat.id
    except Exception as e:
        print(f"Error adding chat: {e}")
        return None
    finally:
        session.close()


# Function to add a message to the chat
def add_message(user_id, chat_id, text, timestamp):
    """Add a message to the database."""
    session = Session()
    try:
        message = Message(sender_id=user_id, chat_id=chat_id, content=text, timestamp=timestamp)
        session.add(message)
        session.commit()
    except Exception as e:
        print(f"Error adding message: {e}")
        session.rollback()
    finally:
        session.close()


# Function to get all user chats
def get_chats(user_id):
    """Get all chats for a user and include the username of the other user, sorted by the last message timestamp."""
    session = Session()
    try:
        # Getting all chats for the user
        chats = session.query(Chat).filter(
            (Chat.user1_id == user_id) | (Chat.user2_id == user_id)
        ).all()
        
        # Adding another user's username
        for chat in chats:
            if chat.user1_id != user_id:
                chat.other_username = session.query(User.username).filter(User.id == chat.user1_id).first().username
            else:
                chat.other_username = session.query(User.username).filter(User.id == chat.user2_id).first().username

            # Отримуємо останнє повідомлення для чату
            last_message = session.query(Message).filter_by(chat_id=chat.id).order_by(Message.timestamp.desc()).first()

            if last_message:
                chat.last_message_time = last_message.timestamp
                chat.last_message_content = last_message.content
            else:
                chat.last_message_time = None
                chat.last_message_content = None

        # Sorting chats by last message timestamp
        sorted_chats = sorted(chats, key=lambda chat: chat.last_message_time if chat.last_message_time else datetime.min, reverse=True)

        return sorted_chats
    except Exception as e:
        print(f"Error fetching chats: {e}")
        return []
    finally:
        session.close()

def get_chat_by_id(chat_id, current_user_id):
    """Get a chat by ID and include the username of the other user."""
    session = Session()
    try:
        # Using joinedload to eagerly load the messages
        chat = session.query(Chat).filter(Chat.id == chat_id).options(joinedload(Chat.messages)).first()
        if chat:
            other_user_id = chat.user1_id if chat.user2_id == current_user_id else chat.user2_id
            
            other_user = session.query(User).filter(User.id == other_user_id).first()
            if other_user:
                chat.other_username = other_user.username
            
        return chat
    except Exception as e:
        print(f"Error fetching chat by id: {e}")
        return None
    finally:
        session.close()

# Function to receive notifications from a specific chat
def get_messages(chat_id):
    """Receive messages from the chat."""
    session = Session()
    try:
        messages = session.query(Message).filter_by(chat_id=chat_id).order_by(Message.timestamp.asc()).all()
        print(messages)
        return messages
    except Exception as e:
        print(f"Error fetching messages: {e}")
        return []
    finally:
        session.close()

def search_users_by_name(query, exclude_user_id):
    """Search for users by name, excluding the current user."""
    session = Session()
    try:
        users = session.query(User).filter(
            User.username.ilike(f"%{query}%"),
            User.id != exclude_user_id
        ).all()
        return [{'id': user.id, 'username': user.username} for user in users]
    except Exception as e:
        print(f"Error searching users: {e}")
        return []
    finally:
        session.close()
