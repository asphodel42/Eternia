from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Налаштування бази даних
DATABASE_URL = "mysql+pymysql://asphodel:42@localhost/eternia_db"
engine = create_engine(DATABASE_URL)
Base = declarative_base()
Session = sessionmaker(bind=engine)

# Модель таблиці користувачів
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), nullable=False, unique=True)
    email = Column(String(100), nullable=False, unique=True)
    password = Column(String(200), nullable=False)

def init_db():
    """Initialize the database and create tables."""
    Base.metadata.create_all(engine)

def create_user(username, email, hashed_password):
    """Adding a new user to the database."""
    session = Session()
    try:
        if session.query(User).filter((User.username == username) | (User.email == email)).first():
            return False
        new_user = User(username=username, email=email, password=hashed_password)
        session.add(new_user)
        session.commit()
        return True
    except Exception as e:
        print(f"Error creating user: {e}")
        return False
    finally:
        session.close()

def verify_user_credentials(email, password, bcrypt):
    """Verification of user login data."""
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
