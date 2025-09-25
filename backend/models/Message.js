const db = require('../config/database');

class Message {
    static async create(senderId, groupId, content, isAnonymous = false) {
        const query = 'INSERT INTO messages (sender_id, group_id, content, is_anonymous) VALUES (?, ?, ?, ?)';
        const [result] = await db.execute(query, [senderId, groupId, content, isAnonymous]);
        return result.insertId;
    }

    static async getGroupMessages(groupId, limit = 50) {
        const query = `
            SELECT m.*, u.username 
            FROM messages m 
            LEFT JOIN users u ON m.sender_id = u.id 
            WHERE m.group_id = ? 
            ORDER BY m.sent_at DESC 
            LIMIT ?
        `;
        const [rows] = await db.execute(query, [groupId, limit]);
        return rows.reverse();
    }

    static async deleteMessage(messageId, userId) {
        const query = 'DELETE FROM messages WHERE id = ? AND sender_id = ?';
        const [result] = await db.execute(query, [messageId, userId]);
        return result.affectedRows > 0;
    }
}

module.exports = Message;
