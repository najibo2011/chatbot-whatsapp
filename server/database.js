const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'chatbot.db');
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function initialize() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      contact_name TEXT,
      last_message TEXT,
      last_message_at DATETIME,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      sender TEXT NOT NULL CHECK(sender IN ('user', 'bot', 'admin')),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone_number);
  `);

  // Create default admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existingAdmin = database.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    database.prepare('INSERT INTO users (email, password) VALUES (?, ?)').run(adminEmail, hashedPassword);
    console.log(`✅ Admin créé: ${adminEmail}`);
  }

  // Default settings
  const defaultSettings = {
    ai_enabled: 'true',
    ai_model: process.env.AI_MODEL || 'gpt-3.5-turbo',
    ai_system_prompt: process.env.AI_SYSTEM_PROMPT || 'Tu es un assistant utile et amical. Réponds de manière concise et professionnelle.',
    ai_max_tokens: process.env.AI_MAX_TOKENS || '500',
    bot_name: 'WhatsApp Bot',
    welcome_message: 'Bonjour ! Je suis un assistant automatique. Comment puis-je vous aider ?',
    auto_reply: 'true'
  };

  const insertSetting = database.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, value);
  }

  console.log('✅ Base de données initialisée');
}

module.exports = { getDb, initialize };
