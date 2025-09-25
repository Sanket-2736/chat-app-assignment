class ChatManager {
    constructor() {
        this.currentUser = null;
        this.isAnonymous = true;
        this.messages = [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkAuth();
    }

    initializeElements() {
        this.messagesContainer = document.getElementById('messagesContainer');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.authModal = document.getElementById('authModal');
        this.loginForm = document.getElementById('loginForm');
        this.registerForm = document.getElementById('registerForm');
    }

    setupEventListeners() {
        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auth forms
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.registerForm.addEventListener('submit', (e) => this.handleRegister(e));

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });
    }

    checkAuth() {
        const token = localStorage.getItem('chat_token');
        const userData = localStorage.getItem('chat_user');
        
        if (token && userData) {
            this.currentUser = JSON.parse(userData);
            this.hideAuthModal();
            this.connectSocket();
            this.loadInitialMessages();
        } else {
            this.showAuthModal();
        }
    }

    showAuthModal() {
        this.authModal.classList.remove('hidden');
    }

    hideAuthModal() {
        this.authModal.classList.add('hidden');
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('emailInput').value;
        const password = document.getElementById('passwordInput').value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.setUserData(data);
                this.hideAuthModal();
                this.connectSocket();
                this.loadInitialMessages();
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('usernameInput').value;
        const email = document.getElementById('regEmailInput').value;
        const password = document.getElementById('regPasswordInput').value;

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();
            
            if (response.ok) {
                this.setUserData(data);
                this.hideAuthModal();
                this.connectSocket();
                this.loadInitialMessages();
            } else {
                alert(data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Register error:', error);
            alert('Registration failed. Please try again.');
        }
    }

    setUserData(data) {
        this.currentUser = data;
        localStorage.setItem('chat_token', data.token);
        localStorage.setItem('chat_user', JSON.stringify(data));
    }

    connectSocket() {
        window.socketManager.setCurrentUser(this.currentUser);
        window.socketManager.connect();
    }

    async loadInitialMessages() {
        try {
            const token = localStorage.getItem('chat_token');
            const response = await fetch('/api/chat/groups/1/messages', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const messages = await response.json();
                this.displayMessages(messages);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    displayMessages(messages) {
        messages.forEach(msg => {
            const messageData = {
                id: msg.id,
                sender: msg.is_anonymous ? 'Anonymous' : msg.username,
                content: msg.content,
                timestamp: new Date(msg.sent_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                isAnonymous: msg.is_anonymous,
                isOwn: msg.sender_id === this.currentUser?.userId
            };
            this.addMessage(messageData, false);
        });
        this.scrollToBottom();
    }

    sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Show message immediately (optimistic update)
        const messageData = {
            id: Date.now(),
            sender: this.isAnonymous ? 'Anonymous' : this.currentUser?.username || 'You',
            content: message,
            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            isAnonymous: this.isAnonymous,
            isOwn: true
        };
        
        this.addMessage(messageData);
        
        // Send through socket
        window.socketManager.sendMessage(message, this.isAnonymous);
        
        // Clear input
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
    }

    addMessage(messageData, isNew = true) {
        // Avoid duplicate messages
        if (this.messages.find(m => m.id === messageData.id)) {
            return;
        }

        this.messages.push(messageData);
        
        const messageElement = this.createMessageElement(messageData);
        if (isNew) {
            messageElement.classList.add('new');
        }
        
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    createMessageElement(messageData) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${messageData.isOwn ? 'own' : 'other'} ${messageData.isAnonymous ? 'anonymous' : ''}`;
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        // Only show sender name for others' messages or when not anonymous
        if (!messageData.isOwn || !messageData.isAnonymous) {
            const sender = document.createElement('div');
            sender.className = 'message-sender';
            sender.textContent = messageData.sender;
            bubble.appendChild(sender);
        }
        
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = messageData.content;
        bubble.appendChild(content);
        
        const time = document.createElement('div');
        time.className = 'message-time';
        time.innerHTML = `${messageData.timestamp} ${messageData.isOwn ? '✓✓' : ''}`;
        bubble.appendChild(time);
        
        messageDiv.appendChild(bubble);
        return messageDiv;
    }

    addSystemMessage(message) {
        const systemDiv = document.createElement('div');
        systemDiv.className = 'system-message';
        systemDiv.textContent = message;
        this.messagesContainer.appendChild(systemDiv);
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    logout() {
        localStorage.removeItem('chat_token');
        localStorage.removeItem('chat_user');
        window.socketManager.disconnect();
        location.reload();
    }
}

// Initialize chat manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatManager = new ChatManager();
    
    // Add some sample messages to match the UI
    setTimeout(() => {
        if (window.chatManager.messages.length === 0) {
            window.chatManager.addMessage({
                id: 1,
                sender: 'Someone',
                content: 'Someone order Bornvita!!',
                timestamp: '11:35 AM',
                isAnonymous: false,
                isOwn: false
            }, false);
            
            window.chatManager.addMessage({
                id: 2,
                sender: 'Anonymous',
                content: 'hahahahah!!',
                timestamp: '11:38 AM',
                isAnonymous: true,
                isOwn: false
            }, false);
            
            window.chatManager.addMessage({
                id: 3,
                sender: 'Anonymous',
                content: "I'm Excited For this Event! Ho-Ho",
                timestamp: '11:56 AM',
                isAnonymous: true,
                isOwn: false
            }, false);
            
            window.chatManager.addMessage({
                id: 4,
                sender: 'You',
                content: 'Hi Guysss 👋',
                timestamp: '12:31 PM',
                isAnonymous: false,
                isOwn: true
            }, false);
            
            window.chatManager.addMessage({
                id: 5,
                sender: 'Anonymous',
                content: 'Hello!',
                timestamp: '12:35 PM',
                isAnonymous: true,
                isOwn: false
            }, false);
            
            window.chatManager.addMessage({
                id: 6,
                sender: 'Anonymous',
                content: 'Yessss!!!!!!',
                timestamp: '12:42 PM',
                isAnonymous: true,
                isOwn: false
            }, false);
            
            window.chatManager.addMessage({
                id: 7,
                sender: 'You',
                content: 'Maybe I am not attending this event!',
                timestamp: '1:36 PM',
                isAnonymous: false,
                isOwn: true
            }, false);
            
            window.chatManager.addMessage({
                id: 8,
                sender: 'Abhay Shukla',
                content: 'We have Surprise For you!!',
                timestamp: '11:35 AM',
                isAnonymous: false,
                isOwn: false
            }, false);
        }
    }, 1000);
});
