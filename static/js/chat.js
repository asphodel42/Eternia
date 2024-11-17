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

document.getElementById('sendButton').addEventListener('click', function() {
    var messageInput = document.getElementById('messageInput');
    var messageText = messageInput.value.trim();

    if (messageText) {
        // Отримуємо chat_id з data-атрибуту елемента #chat-data
        var chatDataElement = document.getElementById('chat-data');
        var selectedChatId = chatDataElement ? parseInt(chatDataElement.getAttribute('data-chat-id'), 10) : null;

        // Перевірка, чи є chat_id
        if (selectedChatId) {
            // Відправка POST-запиту до сервера
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
                    location.reload();
                } else {
                    alert('Failed to send the message. Please try again.');
                }
            })
            .catch(error => console.error('Error:', error));
        } else {
            alert('Chat ID is missing!');
        }
    }
});
