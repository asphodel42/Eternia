// Connetcting to WebSocket
const socket = io.connect(window.location.origin);
// Load chats after loading page
document.addEventListener('DOMContentLoaded', loadChats);
// Calling up the scroll after all messages are loaded
document.addEventListener('DOMContentLoaded', function() {
    scrollToBottom();
});

// Connect to a specific room (chat)
var chatDataElement = document.getElementById('chat-data');
var selectedChatId = chatDataElement ? parseInt(chatDataElement.getAttribute('data-chat-id'), 10) : null;
var currentUserId = document.getElementById('userId').getAttribute('data-user-id');

if (selectedChatId) {
    socket.emit('join', { chat_id: selectedChatId });
}

// Sending message
document.getElementById('sendButton').addEventListener('click', sendMessage);

document.getElementById('messageInput').addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});

// Scroll chat to bottom function
function scrollToBottom() {
    const messageContainer = document.querySelector('.chat-messages');
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

// ~~~ Seach user functions ~~~

// Clear the search dropdown
function clearSearchDropdown() {
    const dropdown = document.getElementById('user-search-dropdown');
    dropdown.innerHTML = '';
    dropdown.style.display = 'none';
}
// Adding new users to search dropdown
function updateSearchDropdown(users) {
    const dropdown = document.getElementById('user-search-dropdown');
    dropdown.innerHTML = '';

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

// ~~~ Requests to server~~~

// Search fetch request
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

// Post request to create new chat
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
                window.location.href = `/chats?chat_id=${data.chat_id}`;
            } else {
                alert('Failed to create chat');
            }
        })
        .catch(error => console.error('Error creating chat:', error));
}

// Post request to send message
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

// Get new message using socketio
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

// Get new chat using socketio
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
// Update chat list when a new message is received
socket.on('update_chat', function (data) {
    const chatList = document.querySelector('.chat-items');
    const chatListItem = document.querySelector(`[data-chat-id="${data.chat_id}"]`);
    if (chatListItem) {
        // Update last message text
        const lastMessage = chatListItem.querySelector('.last-message');
        const lastMessageTime = chatListItem.querySelector('.last-message-time');

        lastMessage.textContent = data.last_message_content;
        lastMessageTime.textContent = data.last_message_time;
        // Move chat first in list
        chatList.prepend(chatListItem);

    } else {
        // If no chat update all chats
        loadChats();
    }
});
// Load chat list
function loadChats() {
    fetch('/api/chats')
        .then(response => response.json())
        .then(data => {
            const chats = data.chats;
            const chatList = document.querySelector('.chat-items');
            chatList.innerHTML = '';

            // Adding chats to list
            chats.forEach(chat => {
                const chatItem = document.createElement('li');
                chatItem.classList.add('chat-item');
                chatItem.dataset.chatId = chat.id;

                const chatLink = document.createElement('a');
                chatLink.href = `/chats?chat_id=${chat.id}`;
                chatLink.classList.add('chat-link');

                const span = document.createElement('span');
                span.textContent = chat.other_username;

                // Adding last message text
                const lastMessage = document.createElement('span');
                lastMessage.classList.add('last-message');
                lastMessage.textContent = chat.last_message_content || "No messages yet";

                // Formatting time
                const lastMessageTime = document.createElement('span');
                lastMessageTime.classList.add('last-message-time');
                const formattedTime = chat.last_message_time ? 
                    new Date(chat.last_message_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: false,  timeZone: 'UTC'}) : '';
                lastMessageTime.textContent = formattedTime;
                console.log(chat.last_message_time)
                console.log(formattedTime)

                chatLink.appendChild(span);
                chatLink.appendChild(lastMessage);
                chatLink.appendChild(lastMessageTime);
                chatItem.appendChild(chatLink);

                chatList.appendChild(chatItem);
            });
        })
        .catch(error => console.error('Error loading chats:', error));
}