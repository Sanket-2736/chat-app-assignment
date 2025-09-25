const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat');
const db = require('./config/database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Socket.IO connection handling
const activeUsers = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-group', (data) => {
        const { groupId, userId, username } = data;
        socket.join(`group_${groupId}`);
        activeUsers.set(socket.id, { userId, username, groupId });
        
        // Notify others in the group
        socket.to(`group_${groupId}`).emit('user-joined', {
            username: username,
            message: `${username} joined the chat`
        });
    });

    socket.on('send-message', async (data) => {
        const { groupId, message, isAnonymous, userId } = data;
        
        try {
            // Save message to database
            const query = 'INSERT INTO messages (sender_id, group_id, content, is_anonymous) VALUES (?, ?, ?, ?)';
            await db.execute(query, [userId, groupId, message, isAnonymous]);
            
            // Get sender info
            let senderName = 'Anonymous';
            if (!isAnonymous) {
                const [userRows] = await db.execute('SELECT username FROM users WHERE id = ?', [userId]);
                if (userRows.length > 0) {
                    senderName = userRows[0].username;
                }
            }
            
            // Broadcast message to all users in the group
            io.to(`group_${groupId}`).emit('new-message', {
                id: Date.now(), // In real app, use the actual message ID from DB
                sender: senderName,
                content: message,
                timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                isAnonymous: isAnonymous,
                isOwn: false // Will be determined on client side
            });
            
        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('message-error', { error: 'Failed to send message' });
        }
    });

    socket.on('disconnect', () => {
        const userData = activeUsers.get(socket.id);
        if (userData) {
            socket.to(`group_${userData.groupId}`).emit('user-left', {
                username: userData.username,
                message: `${userData.username} left the chat`
            });
            activeUsers.delete(socket.id);
        }
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
