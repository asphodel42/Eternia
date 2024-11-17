document.querySelector('.search input').addEventListener('input', function() {
    var query = this.value.toLowerCase();
    var chatItems = document.querySelectorAll('.chat-items');
    
    chatItems.forEach(function(item) {
        var chatName = item.textContent.toLowerCase();
        if (chatName.includes(query)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }d
    });
});