class SocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.currentUser = null;
        this.currentGroup = 1; // Default to Fun Friday Group
    }

    connect() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.isConnected = true;
            this.joinGroup();
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.isConnected = false;
        });

        this.socket.on('new-message', (messageData) => {
            window.chatManager.addMessage(messageData);
        });

        this.socket.on('user-joined', (data) => {
            if (!data.username.includes('Anonymous')) {
                window.chatManager.addSystemMessage(`${data.username} joined the chat`);
            }
        });

        this.socket.on('user-left', (data) => {
            if (!data.username.includes('Anonymous')) {
                window.chatManager.addSystemMessage(`${data.username} left the chat`);
            }
        });

        this.socket.on('message-error', (error) => {
            console.error('Message error:', error);
            alert('Failed to send message. Please try again.');
        });
    }

    joinGroup() {
        if (this.socket && this.currentUser) {
            this.socket.emit('join-group', {
                groupId: this.currentGroup,
                userId: this.currentUser.userId,
                username: this.currentUser.username
            });
        }
    }

    sendMessage(message, isAnonymous = true) {
        if (this.socket && this.isConnected) {
            this.socket.emit('send-message', {
                groupId: this.currentGroup,
                message: message,
                isAnonymous: isAnonymous,
                userId: this.currentUser?.userId || 2 // Default anonymous user ID
            });
        }
    }

    setCurrentUser(userData) {
        this.currentUser = userData;
        if (this.isConnected) {
            this.joinGroup();
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Initialize socket manager
window.socketManager = new SocketManager();
