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