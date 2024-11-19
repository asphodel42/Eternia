// Завантажуємо чати при завантаженні сторінки
document.addEventListener('DOMContentLoaded', loadChats);

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
document.getElementById('sendButton').addEventListener('click', sendMessage);

document.getElementById('messageInput').addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // Запобігає додаванню нового рядка
        sendMessage();
    }
});

function sendMessage() {
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
                loadChats();
            } else {
                alert('Failed to send the message. Please try again.');
            }
        })
        .catch(error => console.error('Error:', error));
    }
}

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
        loadChats();
    }
});

socket.on('new_chat', function (data) {
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
        loadChats();
    }
});

function loadChats() {
    fetch('/api/chats')  // Запит до нового API маршруту
        .then(response => response.json())
        .then(data => {
            const chats = data.chats;
            const chatList = document.querySelector('.chat-items');
            chatList.innerHTML = '';  // Очищаємо список чатів

            // Додаємо чати в список
            chats.forEach(chat => {
                const chatItem = document.createElement('li');
                chatItem.classList.add('chat-item');
                chatItem.dataset.chatId = chat.id;  // Зберігаємо chat id в атрибуті

                const chatLink = document.createElement('a');
                chatLink.href = `/chats?chat_id=${chat.id}`;
                chatLink.classList.add('chat-link');

                const span = document.createElement('span');
                span.textContent = chat.other_username;

                // Додаємо текст останнього повідомлення
                const lastMessage = document.createElement('span');
                lastMessage.classList.add('last-message');
                lastMessage.textContent = chat.last_message_content || "No messages yet";

                // Форматуємо час, прибираючи секунди
                const lastMessageTime = document.createElement('span');
                lastMessageTime.classList.add('last-message-time');
                const formattedTime = chat.last_message_time ? 
                    new Date(chat.last_message_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '';
                lastMessageTime.textContent = formattedTime;

                // Додаємо елементи в chatLink
                chatLink.appendChild(span);
                chatLink.appendChild(lastMessage);
                chatLink.appendChild(lastMessageTime);
                chatItem.appendChild(chatLink);

                // Додаємо чат в список
                chatList.appendChild(chatItem);
            });
        })
        .catch(error => console.error('Error loading chats:', error));
}