const OpenAI = require('openai');
const { getDb } = require('../database');

let openai;

function getClient() {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

function getSettings() {
  const db = getDb();
  const settings = {};
  const rows = db.prepare('SELECT key, value FROM settings').all();
  rows.forEach(row => { settings[row.key] = row.value; });
  return settings;
}

async function generateResponse(userMessage, conversationHistory = []) {
  try {
    const settings = getSettings();

    if (settings.ai_enabled !== 'true') {
      return null;
    }

    const client = getClient();

    const messages = [
      { role: 'system', content: settings.ai_system_prompt || 'Tu es un assistant utile.' }
    ];

    // Add conversation history
    for (const msg of conversationHistory.slice(0, -1)) {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    }

    // Add current message
    messages.push({ role: 'user', content: userMessage });

    const completion = await client.chat.completions.create({
      model: settings.ai_model || 'gpt-3.5-turbo',
      messages,
      max_tokens: parseInt(settings.ai_max_tokens) || 500,
      temperature: 0.7
    });

    return completion.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Erreur OpenAI:', error.message);
    return null;
  }
}

module.exports = { generateResponse };
