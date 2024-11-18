document.querySelector('.search input').addEventListener('input', function() {
    var query = this.value.trim().toLowerCase();
    var chatItems = document.querySelectorAll('.chat-item');
    
    chatItems.forEach(function(item) {
        var chatName = item.textContent.trim().toLowerCase();
        if (chatName.includes(query)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
});

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

