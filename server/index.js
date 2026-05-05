require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const db = require('./database');
const whatsappService = require('./services/whatsapp');
const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chats');
const settingsRoutes = require('./routes/settings');
const statsRoutes = require('./routes/stats');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? [process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '*']
      : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stats', statsRoutes);

// Serve dashboard in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dashboard/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dashboard/dist/index.html'));
  });
}

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('Dashboard connecté');

  socket.on('disconnect', () => {
    console.log('Dashboard déconnecté');
  });
});

// Make io accessible to routes
app.set('io', io);

// Ensure JWT_SECRET exists
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'default-secret-change-me';
  console.warn('⚠️  JWT_SECRET non défini, utilisation d\'un secret par défaut');
}

const PORT = process.env.PORT || 3001;

try {
  // Initialize database
  db.initialize();
  console.log('✅ Base de données initialisée');

  // Initialize WhatsApp
  whatsappService.initialize(io);
  console.log('✅ Service WhatsApp lancé');
} catch (error) {
  console.error('❌ Erreur initialisation:', error.message);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
