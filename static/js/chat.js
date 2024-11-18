document.querySelector('.search input').addEventListener('input', function () {
    var query = this.value.trim();
    if (query) {
        fetch(`/search_users?query=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(users => {
                updateSearchDropdown(users);
            })
            .catch(error => console.error('Error searching users:', error));
    } else {
        clearSearchDropdown();
    }
});

function updateSearchDropdown(users) {
    const dropdown = document.getElementById('user-search-dropdown');
    dropdown.innerHTML = ''; // Очищаємо випадайку

    users.forEach(user => {
        const item = document.createElement('div');
        item.textContent = user.username;
        item.classList.add('dropdown-item');
        item.addEventListener('click', function () {
            createChat(user.id);
        });
        dropdown.appendChild(item);
    });

    dropdown.style.display = users.length ? 'block' : 'none';
}

function clearSearchDropdown() {
    const dropdown = document.getElementById('user-search-dropdown');
    dropdown.innerHTML = '';
    dropdown.style.display = 'none';
}

function createChat(targetUserId) {
    fetch('/create_chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target_user_id: targetUserId }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.chat_id) {
                window.location.href = `/chats?chat_id=${data.chat_id}`; // Переходимо до нового чату
            } else {
                alert('Failed to create chat');
            }
        })
        .catch(error => console.error('Error creating chat:', error));
}

function scrollToBottom() {
    const messageContainer = document.querySelector('.chat-messages');
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

// Викликаємо прокрутку після того, як всі повідомлення завантажено
document.addEventListener('DOMContentLoaded', function() {
    scrollToBottom();
});

// Підключення до WebSocket
const socket = io.connect(window.location.origin);

// Підключення до конкретної кімнати (чату)
var chatDataElement = document.getElementById('chat-data');
var selectedChatId = chatDataElement ? parseInt(chatDataElement.getAttribute('data-chat-id'), 10) : null;
var currentUserId = document.getElementById('userId').getAttribute('data-user-id');

if (selectedChatId) {
    socket.emit('join', { chat_id: selectedChatId });
}

// Відправка повідомлення
document.getElementById('sendButton').addEventListener('click', function () {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value.trim();

    if (messageText) {
        fetch('/send_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: selectedChatId,
                message: messageText,
            }),
        })
        .then(response => {
            if (response.ok) {
                messageInput.value = '';
            } else {
                alert('Failed to send the message. Please try again.');
            }
        })
        .catch(error => console.error('Error:', error));
    }
});

// Отримання нових повідомлень
socket.on('new_message', function (data) {
    if (data.chat_id == selectedChatId) {
        const chatMessages = document.querySelector('.chat-messages');
        var currentUserId = document.getElementById('userId').getAttribute('data-user-id');

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        
        if (data.sender_id == currentUserId) {
            messageDiv.classList.add('sent');
            messageDiv.style.backgroundColor= "#007bff";
        } else {
            messageDiv.classList.add('received');
            messageDiv.style.backgroundColor= "#f0f0f0";
        }

        // Додаємо текст повідомлення та час
        messageDiv.innerHTML = `
            <span class="message-text">${data.message}</span>
            <span class="message-time">${data.timestamp}</span>
        `;

        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }
});

socket.on('new_chat', function (data) {
    console.log('New chat received', data);

    if (data.chat_id && data.other_username) {
        const chatItem = document.createElement('li');
        chatItem.classList.add('chat-item');

        const chatLink = document.createElement('a');
        chatLink.href = `/chats?chat_id=${data.chat_id}`;
        chatLink.classList.add('chat-link');

        const span = document.createElement('span');
        span.textContent = data.other_username;

        // Додаємо елемент в список
        chatLink.appendChild(span);
        chatItem.appendChild(chatLink);

        // Додаємо новий чат в список
        const chatList = document.querySelector('.chat-items');
        chatList.appendChild(chatItem);
    }
});