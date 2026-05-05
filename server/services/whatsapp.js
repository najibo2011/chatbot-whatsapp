const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const aiService = require('./ai');
const { getDb } = require('../database');

let client;
let io;
let qrCodeData = null;
let connectionStatus = 'disconnected';

function getPuppeteerOptions() {
  const opts = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    opts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  } else if (process.env.NODE_ENV === 'production') {
    const fs = require('fs');
    const possiblePaths = [
      '/root/.nix-profile/bin/chromium',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ];
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        opts.executablePath = p;
        console.log('Chromium trouvé à:', p);
        break;
      }
    }
  }
  return opts;
}

function createClient() {
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: getPuppeteerOptions()
  });

  client.on('qr', async (qr) => {
    console.log('📱 QR Code généré');
    qrCodeData = await qrcode.toDataURL(qr);
    connectionStatus = 'qr';
    io.emit('whatsapp:qr', qrCodeData);
    io.emit('whatsapp:status', connectionStatus);
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp connecté');
    connectionStatus = 'connected';
    qrCodeData = null;
    io.emit('whatsapp:status', connectionStatus);
  });

  client.on('authenticated', () => {
    console.log('🔐 WhatsApp authentifié');
  });

  client.on('auth_failure', (msg) => {
    console.error('❌ Échec auth WhatsApp:', msg);
    connectionStatus = 'disconnected';
    io.emit('whatsapp:status', connectionStatus);
  });

  client.on('disconnected', (reason) => {
    console.log('❌ WhatsApp déconnecté:', reason);
    connectionStatus = 'disconnected';
    qrCodeData = null;
    io.emit('whatsapp:status', connectionStatus);
  });

  client.on('message', async (message) => {
    try {
      await handleIncomingMessage(message);
    } catch (error) {
      console.error('Erreur traitement message:', error);
    }
  });

  client.initialize().catch(err => {
    console.error('❌ Erreur initialisation WhatsApp:', err.message);
    connectionStatus = 'error';
    io.emit('whatsapp:status', connectionStatus);
  });
}

function initialize(socketIo) {
  io = socketIo;
  createClient();
}

async function handleIncomingMessage(message) {
  if (message.from === 'status@broadcast') return;

  const db = getDb();
  const phoneNumber = message.from.replace('@c.us', '');
  const contactName = message._data.notifyName || phoneNumber;

  // Find or create conversation
  let conversation = db.prepare('SELECT * FROM conversations WHERE phone_number = ?').get(phoneNumber);

  if (!conversation) {
    const result = db.prepare(
      'INSERT INTO conversations (phone_number, contact_name, last_message, last_message_at) VALUES (?, ?, ?, ?)'
    ).run(phoneNumber, contactName, message.body, new Date().toISOString());
    conversation = { id: result.lastInsertRowid, phone_number: phoneNumber, contact_name: contactName };
  } else {
    db.prepare('UPDATE conversations SET last_message = ?, last_message_at = ?, contact_name = ? WHERE id = ?')
      .run(message.body, new Date().toISOString(), contactName, conversation.id);
  }

  // Save incoming message
  db.prepare('INSERT INTO messages (conversation_id, content, sender) VALUES (?, ?, ?)')
    .run(conversation.id, message.body, 'user');

  // Emit to dashboard
  io.emit('message:new', {
    conversationId: conversation.id,
    phoneNumber,
    contactName,
    content: message.body,
    sender: 'user',
    timestamp: new Date().toISOString()
  });

  // Check if auto-reply is enabled
  const autoReply = db.prepare("SELECT value FROM settings WHERE key = 'auto_reply'").get();
  const aiEnabled = db.prepare("SELECT value FROM settings WHERE key = 'ai_enabled'").get();

  if (autoReply?.value === 'true' && aiEnabled?.value === 'true') {
    // Get conversation history for context
    const history = db.prepare(
      'SELECT content, sender FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT 10'
    ).all(conversation.id).reverse();

    const aiResponse = await aiService.generateResponse(message.body, history);

    if (aiResponse) {
      // Save bot response
      db.prepare('INSERT INTO messages (conversation_id, content, sender) VALUES (?, ?, ?)')
        .run(conversation.id, aiResponse, 'bot');

      // Send reply
      await message.reply(aiResponse);

      // Update conversation
      db.prepare('UPDATE conversations SET last_message = ?, last_message_at = ? WHERE id = ?')
        .run(aiResponse, new Date().toISOString(), conversation.id);

      // Emit to dashboard
      io.emit('message:new', {
        conversationId: conversation.id,
        phoneNumber,
        contactName,
        content: aiResponse,
        sender: 'bot',
        timestamp: new Date().toISOString()
      });
    }
  }
}

async function sendMessage(phoneNumber, content) {
  if (!client || connectionStatus !== 'connected') {
    throw new Error('WhatsApp non connecté');
  }

  const chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
  await client.sendMessage(chatId, content);
}

function getStatus() {
  return connectionStatus;
}

function getQrCode() {
  return qrCodeData;
}

async function logout() {
  if (client) {
    try {
      await client.logout();
    } catch (err) {
      console.error('Erreur logout:', err.message);
    }
    try {
      await client.destroy();
    } catch (err) {
      console.error('Erreur destroy:', err.message);
    }
    client = null;
    connectionStatus = 'disconnected';
    qrCodeData = null;
    io.emit('whatsapp:status', connectionStatus);
  }
}

async function reconnect() {
  if (client) {
    try {
      await client.destroy();
    } catch (err) {
      console.error('Erreur destroy lors reconnexion:', err.message);
    }
    client = null;
  }
  connectionStatus = 'disconnected';
  qrCodeData = null;
  io.emit('whatsapp:status', connectionStatus);
  createClient();
}

module.exports = { initialize, sendMessage, getStatus, getQrCode, logout, reconnect };
