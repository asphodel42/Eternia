from flask import Flask, render_template, request, redirect, url_for, flash
from flask_bcrypt import Bcrypt
from db import init_db, create_user, verify_user_credentials

app = Flask(__name__)
app.secret_key = 'c5f1b80dc09eec32d894056b983790d5eeeb1338f07c9334c8cd57a67932726a'
bcrypt = Bcrypt(app)

@app.route('/')
def index():
    return redirect(url_for('register'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        if create_user(username, email, hashed_password):
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))
        else:
            flash('User already exists or registration failed.', 'danger')
            return redirect(url_for('register'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']

        if verify_user_credentials(email, password, bcrypt):
            flash('Login successful!', 'success')
            # TODO: Додати логіку перенаправлення на домашню сторінку
            return redirect(url_for('login'))  # Після авторизації змінити маршрут
        else:
            flash('Invalid credentials. Please try again.', 'danger')

    return render_template('login.html')

if __name__ == '__main__':
    init_db()
    app.run(host='localhost', port=5000,debug=True)