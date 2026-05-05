const express = require('express');
const { getDb } = require('../database');
const authMiddleware = require('../middleware/auth');
const whatsappService = require('../services/whatsapp');

const router = express.Router();

// Get all conversations
router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const conversations = db.prepare(
    'SELECT * FROM conversations ORDER BY last_message_at DESC'
  ).all();
  res.json(conversations);
});

// Get messages for a conversation
router.get('/:id/messages', authMiddleware, (req, res) => {
  const db = getDb();
  const messages = db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC'
  ).all(req.params.id);
  res.json(messages);
});

// Send a message from admin
router.post('/:id/send', authMiddleware, async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Contenu du message requis' });
  }

  const db = getDb();
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(req.params.id);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation non trouvée' });
  }

  try {
    await whatsappService.sendMessage(conversation.phone_number, content);

    // Save message
    db.prepare('INSERT INTO messages (conversation_id, content, sender) VALUES (?, ?, ?)')
      .run(conversation.id, content, 'admin');

    // Update conversation
    db.prepare('UPDATE conversations SET last_message = ?, last_message_at = ? WHERE id = ?')
      .run(content, new Date().toISOString(), conversation.id);

    const io = req.app.get('io');
    io.emit('message:new', {
      conversationId: conversation.id,
      phoneNumber: conversation.phone_number,
      contactName: conversation.contact_name,
      content,
      sender: 'admin',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a conversation
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(req.params.id);
  db.prepare('DELETE FROM conversations WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// WhatsApp status
router.get('/whatsapp/status', authMiddleware, (req, res) => {
  res.json({
    status: whatsappService.getStatus(),
    qrCode: whatsappService.getQrCode()
  });
});

// WhatsApp logout
router.post('/whatsapp/logout', authMiddleware, async (req, res) => {
  try {
    await whatsappService.logout();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
