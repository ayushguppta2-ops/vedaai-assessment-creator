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
app.use((req, res, next) => { res.header('Access-Control-Allow-Origin','*'); res.header('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS,PATCH'); res.header('Access-Control-Allow-Headers','Content-Type,Authorization,Accept'); if (req.method==='OPTIONS') return res.sendStatus(200); next(); });
export const io = new SocketIOServer(httpServer, { cors: { origin: '*' }, transports: ['polling','websocket'], allowEIO3: true });
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/assignments', assignmentRoutes);
app.get('/api/health', (req, res) => { res.json({ status: 'ok', mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }); });
io.on('connection', (socket) => { socket.on('join:assignment', (id: string) => socket.join(id)); socket.on('leave:assignment', (id: string) => socket.leave(id)); });
async function start() {
  try { await mongoose.connect(process.env.MONGODB_URI!); console.log('✅ MongoDB connected'); } catch (err: any) { console.error('❌ MongoDB failed:', err.message); process.exit(1); }
  await connectRedis();
  try { createAssessmentWorker(io); } catch {}
  const PORT = process.env.PORT || 5000;
  httpServer.listen(Number(PORT), '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
}
start();
