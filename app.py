from flask import Flask, render_template, request, redirect, url_for, flash, session
from db import init_db, create_user, verify_user_credentials, get_user_by_email, get_chats, add_message, get_messages, get_chat_by_id

app = Flask(__name__)
app.secret_key = 'c5f1b80dc09eec32d894056b983790d5eeeb1338f07c9334c8cd57a67932726a'

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('chats'))

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

@app.route('/chats')
def chats():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user_id = session['user_id']
    username = session['username']
    chats = get_chats(user_id)
    print(user_id)
    print(chats)

    chat_id = request.args.get('chat_id')
    selected_chat = None
    if chat_id:
        selected_chat = get_chat_by_id(chat_id)

    return render_template('chat.html', username=username, chats=chats, selected_chat=selected_chat)


@app.route('/chat/<int:chat_id>', methods=['GET', 'POST'])
def chat(chat_id):
    if 'user_id' not in session:
        return redirect(url_for('login'))
    
    user_id = session['user_id']
    chat = get_chat_by_id(chat_id)  # Отримуємо чат по id
    messages = get_messages(chat_id)  # Отримуємо повідомлення для чату

    if request.method == 'POST':
        message_text = request.form['message']
        add_message(user_id, chat_id, message_text)  # Створюємо нове повідомлення
        return redirect(url_for('chat', chat_id=chat_id))

    return render_template('chat.html', chat=chat, messages=messages, chats=get_chats(user_id))

if __name__ == '__main__':
    init_db()
    app.run(debug=True)