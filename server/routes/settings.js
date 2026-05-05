const express = require('express');
const { getDb } = require('../database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get all settings
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  rows.forEach(row => { settings[row.key] = row.value; });
  res.json(settings);
});

// Update settings
router.put('/', authMiddleware, (req, res) => {
  const db = getDb();
  const updates = req.body;

  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const transaction = db.transaction((settings) => {
    for (const [key, value] of Object.entries(settings)) {
      stmt.run(key, String(value));
    }
  });

  try {
    transaction(updates);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
