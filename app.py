from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_socketio import SocketIO, join_room
from db import (init_db, create_user, verify_user_credentials, get_user_by_email,
                get_user_by_id, get_chats, add_message, get_messages,
                get_chat_by_id, add_chat, search_users_by_name)
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'c5f1b80dc09eec32d894056b983790d5eeeb1338f07c9334c8cd57a67932726a'
socketio = SocketIO(app)

# ~~~ Flask routes ~~~
@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('chats'))

# Register route
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        if create_user(username, email, password):
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))
        else:
            flash('User already exists or registration failed.', 'danger')
    
    return render_template('register.html')

# Loging route
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        if verify_user_credentials(email, password):
            user = get_user_by_email(email)
            session['user_id'] = user.id
            session['username'] = user.username
            flash('Login successful!', 'success')
            return redirect(url_for('chats'))
        else:
            flash('Invalid credentials. Please try again.', 'danger')

    return render_template('login.html')

# Chat route
@app.route('/chats')
def chats():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user_id = session['user_id']
    username = session['username']
    chats = get_chats(user_id)

    chat_id = request.args.get('chat_id')
    selected_chat = None
    if chat_id:
        selected_chat = get_chat_by_id(chat_id, user_id)

    return render_template('chat.html', user_id=user_id, username=username, chats=chats, selected_chat=selected_chat)

# Selected chat route
@app.route('/chat/<int:chat_id>', methods=['GET'])
def chat(chat_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user_id = session['user_id']
    chat = get_chat_by_id(chat_id)
    messages = get_messages(chat_id)

    return render_template('chat.html', chat=chat, messages=messages, chats=get_chats(user_id))

# API endpoint to fetch all chats of the logged-in user, 
# including the latest message and its timestamp.
@app.route('/api/chats', methods=['GET'])
def api_chats():
    if 'user_id' not in session:
        return jsonify({'error': 'User not logged in'}), 403
    user_id = session['user_id']
    chats = get_chats(user_id)
    # Froming data to respond
    chats_data = [{
        'id': chat.id,
        'other_username': chat.other_username,
        'last_message_content': chat.last_message_content,
        'last_message_time': chat.last_message_time,
    } for chat in chats]

    return jsonify({'chats': chats_data})

# Send message respond
@app.route('/send_message', methods=['POST'])
def send_message():
    if 'user_id' not in session:
        return {'error': 'Unauthorized'}, 401

    data = request.get_json()
    chat_id = data.get('chat_id')
    message_text = data.get('message')

    if not chat_id or not message_text:
        return {'error': 'Invalid data'}, 400

    user_id = session['user_id']
    timestamp = datetime.now()
    add_message(user_id, chat_id, message_text, timestamp)

    # Оновлюємо інформацію в списку чатів
    socketio.emit('update_chat', {
        'chat_id': chat_id,
        'last_message_content': message_text,
        'last_message_time': timestamp.strftime('%H:%M')
    }, room=f"chat_{chat_id}")

    # Надсилаємо нове повідомлення у кімнату чату
    socketio.emit('new_message', {
        'chat_id': chat_id,
        'message': message_text,
        'timestamp': timestamp.strftime('%H:%M'),
        'sender_id': user_id
    }, room=f"chat_{chat_id}")

    return {'success': True}, 200

@socketio.on('join')
def on_join(data):
    chat_id = data['chat_id']
    join_room(f'chat_{chat_id}')
    print(f'User joined room chat_{chat_id}')

@socketio.on('connect')
def handle_connect():
    user_id = session.get('user_id')
    if user_id:
        # Adding user to all his chats
        user_chats = get_chats(user_id)
        for chat in user_chats:
            join_room(f"chat_{chat.id}")
        join_room(f"user_{user_id}")
        print(f"User {user_id} connected and joined their rooms")

@app.route('/search_users', methods=['GET'])
def search_users():
    # Search users by query.
    query = request.args.get('query', '').strip()
    user_id = session.get('user_id')

    if not user_id or not query:
        return jsonify({'error': 'Invalid request'}), 400

    # Searching for user
    users = search_users_by_name(query=query, exclude_user_id=user_id)
    return jsonify(users), 200

# Route to create a chat between two users.
@app.route('/create_chat', methods=['POST'])
def create_chat():
   
    user_id = session.get('user_id')
    target_user_id = request.json.get('target_user_id')
    if not user_id or not target_user_id:
        return jsonify({'error': 'Missing user IDs'}), 400

    # Use the add_chat function to create or search for a chat
    chat_id = add_chat(user1_id=user_id, user2_id=target_user_id)

    if chat_id:
        socketio.emit('new_chat', {
            'chat_id': chat_id,
            'other_username': get_user_by_id(target_user_id).username
        }, room=f"user_{user_id}")
        socketio.emit('new_chat', {
            'chat_id': chat_id,
            'other_username': get_user_by_id(user_id).username
        }, room=f"user_{target_user_id}")
        return jsonify({'chat_id': chat_id}), 201
    else:
        return jsonify({'error': 'Failed to create chat'}), 500

if __name__ == '__main__':
    init_db()
    socketio.run(app, debug=True)