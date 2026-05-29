import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Assignment from '../models/Assignment';
import { getAssessmentQueue, redisClient } from '../services/queue';
import { processAssignment } from '../workers/assessmentWorker';
import { io } from '../server';
const router = Router();
const storage = multer.diskStorage({ destination: (req, file, cb) => { const d = path.join(__dirname, '../../uploads'); if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); cb(null, d); }, filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`) });
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
async function runDirectly(assignmentId: string) {
  try { await processAssignment(assignmentId); }
  catch (err: any) { await Assignment.findByIdAndUpdate(assignmentId, { status: 'failed', error: err.message }); if (io) io.to(assignmentId).emit('job:failed', { assignmentId, status: 'failed', message: err.message, progress: 0 }); }
}
async function enqueueOrRun(assignmentId: string) {
  const queue = getAssessmentQueue();
  if (queue) { try { const job = await queue.add('generate-assessment', { assignmentId }, { priority: 1 }); await Assignment.findByIdAndUpdate(assignmentId, { jobId: job.id }); return; } catch {} }
  setImmediate(() => runDirectly(assignmentId));
}
router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<any> => {
  try {
    const { title, subject, dueDate, questionTypes, numberOfQuestions, totalMarks, additionalInstructions, difficulty } = req.body;
    if (!title || !subject || !dueDate || !numberOfQuestions || !totalMarks) return res.status(400).json({ success: false, error: 'Missing required fields' });
    if (Number(numberOfQuestions) <= 0 || Number(totalMarks) <= 0) return res.status(400).json({ success: false, error: 'Values must be positive' });
    const parsedTypes = typeof questionTypes === 'string' ? JSON.parse(questionTypes) : (questionTypes || ['short_answer']);
    let fileText: string | undefined, fileUrl: string | undefined;
    if (req.file) { fileUrl = `/uploads/${req.file.filename}`; if (req.file.mimetype === 'text/plain') fileText = String(fs.readFileSync(req.file.path)); }
    const assignment = await Assignment.create({ title, subject, dueDate: new Date(dueDate), questionTypes: parsedTypes, numberOfQuestions: Number(numberOfQuestions), totalMarks: Number(totalMarks), additionalInstructions, difficulty: difficulty || 'mixed', fileUrl, fileText, status: 'pending' });
    const assignmentId = assignment._id.toString();
    await enqueueOrRun(assignmentId);
    try { await redisClient.setEx(`assignment:${assignmentId}`, 300, JSON.stringify(assignment)); } catch {}
    res.status(201).json({ success: true, data: { assignmentId, status: 'pending', message: 'Generating...' } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try { const data = await Assignment.find().select('-generatedPaper -fileText').sort({ createdAt: -1 }).limit(50); res.json({ success: true, data }); }
  catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    try { const c = await redisClient.get(`assignment:${id}`); if (c && typeof c === 'string') { const d = JSON.parse(c); if (d.status === 'completed') return res.json({ success: true, data: d, fromCache: true }); } } catch {}
    const assignment = await Assignment.findById(id);
    if (!assignment) return res.status(404).json({ success: false, error: 'Not found' });
    if (assignment.status === 'completed') { try { await redisClient.setEx(`assignment:${id}`, 3600, JSON.stringify(assignment)); } catch {} }
    res.json({ success: true, data: assignment });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});
router.post('/:id/regenerate', async (req: Request, res: Response): Promise<any> => {
  try {
    const id = String(req.params.id);
    if (!await Assignment.findById(id)) return res.status(404).json({ success: false, error: 'Not found' });
    await Assignment.findByIdAndUpdate(id, { status: 'pending', generatedPaper: undefined, error: undefined });
    try { await redisClient.del(`assignment:${id}`); } catch {}
    await enqueueOrRun(id);
    res.json({ success: true, data: { assignmentId: id, status: 'pending' } });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try { await Assignment.findByIdAndDelete(req.params.id); try { await redisClient.del(`assignment:${req.params.id}`); } catch {}; res.json({ success: true }); }
  catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});
export default router;
