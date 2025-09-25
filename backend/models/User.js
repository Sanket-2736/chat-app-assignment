const db = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    static async create(username, email, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        const [result] = await db.execute(query, [username, email, hashedPassword]);
        return result.insertId;
    }

    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await db.execute(query, [email]);
        return rows[0];
    }

    static async findById(id) {
        const query = 'SELECT id, username, email, profile_picture, is_online, last_seen FROM users WHERE id = ?';
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    }

    static async updateOnlineStatus(id, isOnline) {
        const query = 'UPDATE users SET is_online = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?';
        await db.execute(query, [isOnline, id]);
    }

    static async validatePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }
}

module.exports = User;
