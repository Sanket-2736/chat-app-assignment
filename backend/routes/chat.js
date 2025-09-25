const express = require('express');
const Group = require('../models/Group');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

router.get('/groups', async (req, res) => {
    try {
        const groups = await Group.getUserGroups(req.userId);
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/groups/:groupId/messages', async (req, res) => {
    try {
        const { groupId } = req.params;
        const messages = await Message.getGroupMessages(groupId);
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/groups', async (req, res) => {
    try {
        const { name, description } = req.body;
        const groupId = await Group.create(name, description, req.userId);
        res.status(201).json({ groupId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
