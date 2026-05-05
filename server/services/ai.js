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
    console.log('🤖 IA settings:', { ai_enabled: settings.ai_enabled, ai_model: settings.ai_model, auto_reply: settings.auto_reply });

    if (settings.ai_enabled !== 'true') {
      console.log('⏭️ IA désactivée, pas de réponse');
      return null;
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY non définie');
      return null;
    }

    const client = getClient();
    const model = settings.ai_model || 'gpt-4o-mini';

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

    console.log(`🤖 Envoi à OpenAI (${model}), ${messages.length} messages`);

    const completion = await client.chat.completions.create({
      model,
      messages,
      max_tokens: parseInt(settings.ai_max_tokens) || 500,
      temperature: 0.7
    });

    const response = completion.choices[0]?.message?.content || null;
    console.log('🤖 Réponse IA:', response ? response.substring(0, 100) + '...' : 'null');
    return response;
  } catch (error) {
    console.error('❌ Erreur OpenAI:', error.message);
    return null;
  }
}

module.exports = { generateResponse };
