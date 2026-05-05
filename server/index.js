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
    origin: ['http://localhost:5173', 'http://localhost:3000'],
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

// Initialize database
db.initialize();

// Initialize WhatsApp
whatsappService.initialize(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
