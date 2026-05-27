import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import assignmentRoutes from './routes/assignments';
import { connectRedis } from './services/queue';
import { createAssessmentWorker } from './workers/assessmentWorker';

const app = express();
const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/assignments', assignmentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: { mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }
  });
});

// WebSocket
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('join:assignment', (assignmentId: string) => {
    socket.join(assignmentId);
    console.log(`Client ${socket.id} joined room: ${assignmentId}`);
  });

  socket.on('leave:assignment', (assignmentId: string) => {
    socket.leave(assignmentId);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// DB + Start
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vedaai');
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.log('⚠️  MongoDB not available, using in-memory mode');
  }

  await connectRedis();

  // Start worker inline (for single-process deployment)
  try {
    createAssessmentWorker(io);
    console.log('✅ BullMQ Worker started');
  } catch (err) {
    console.log('⚠️  BullMQ worker not started (Redis may be unavailable)');
  }

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

start();

export { io };
