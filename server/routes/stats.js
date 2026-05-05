const express = require('express');
const { getDb } = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get dashboard stats
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();

  const totalConversations = db.prepare('SELECT COUNT(*) as count FROM conversations').get().count;
  const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
  const todayMessages = db.prepare(
    "SELECT COUNT(*) as count FROM messages WHERE date(timestamp) = date('now')"
  ).get().count;
  const activeConversations = db.prepare(
    'SELECT COUNT(*) as count FROM conversations WHERE is_active = 1'
  ).get().count;

  // Messages per day (last 7 days)
  const messagesPerDay = db.prepare(`
    SELECT date(timestamp) as date, COUNT(*) as count
    FROM messages
    WHERE timestamp >= datetime('now', '-7 days')
    GROUP BY date(timestamp)
    ORDER BY date ASC
  `).all();

  // Messages by sender type
  const messagesBySender = db.prepare(`
    SELECT sender, COUNT(*) as count
    FROM messages
    GROUP BY sender
  `).all();

  res.json({
    totalConversations,
    totalMessages,
    todayMessages,
    activeConversations,
    messagesPerDay,
    messagesBySender
  });
});

module.exports = router;
