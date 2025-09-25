const db = require('../config/database');

class Group {
    static async create(name, description, createdBy) {
        const query = 'INSERT INTO groups_table (name, description, created_by) VALUES (?, ?, ?)';
        const [result] = await db.execute(query, [name, description, createdBy]);
        
        await this.addMember(result.insertId, createdBy, true);
        
        return result.insertId;
    }

    static async findById(id) {
        const query = 'SELECT * FROM groups_table WHERE id = ?';
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    }

    static async getUserGroups(userId) {
        const query = `
            SELECT g.*, gm.is_admin 
            FROM groups_table g 
            INNER JOIN group_members gm ON g.id = gm.group_id 
            WHERE gm.user_id = ?
        `;
        const [rows] = await db.execute(query, [userId]);
        return rows;
    }

    static async addMember(groupId, userId, isAdmin = false) {
        const query = 'INSERT INTO group_members (group_id, user_id, is_admin) VALUES (?, ?, ?)';
        const [result] = await db.execute(query, [groupId, userId, isAdmin]);
        return result.insertId;
    }

    static async getGroupMembers(groupId) {
        const query = `
            SELECT u.id, u.username, u.profile_picture, gm.is_admin 
            FROM users u 
            INNER JOIN group_members gm ON u.id = gm.user_id 
            WHERE gm.group_id = ?
        `;
        const [rows] = await db.execute(query, [groupId]);
        return rows;
    }
}

module.exports = Group;
