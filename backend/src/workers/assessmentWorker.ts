import { Worker, Job } from 'bullmq';
import { redisConfig, getAssessmentQueue } from '../services/queue';
import { generateAssessment } from '../services/aiService';
import Assignment from '../models/Assignment';
let io: any = null;
const notify = (event: string, data: any) => { if (io) io.to(data.assignmentId).emit(event, data); };
export async function processAssignment(assignmentId: string, jobId?: string) {
  await Assignment.findByIdAndUpdate(assignmentId, { status: 'processing', jobId });
  notify('job:progress', { assignmentId, status: 'processing', message: 'AI is generating your question paper...', progress: 20 });
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error('Assignment not found');
  notify('job:progress', { assignmentId, status: 'processing', message: 'Structuring questions and sections...', progress: 50 });
  const generatedPaper = await generateAssessment({ title: assignment.title, subject: assignment.subject, questionTypes: assignment.questionTypes, numberOfQuestions: assignment.numberOfQuestions, totalMarks: assignment.totalMarks, difficulty: assignment.difficulty, additionalInstructions: assignment.additionalInstructions, fileText: assignment.fileText });
  notify('job:progress', { assignmentId, status: 'processing', message: 'Finalizing question paper...', progress: 80 });
  await Assignment.findByIdAndUpdate(assignmentId, { status: 'completed', generatedPaper });
  notify('job:completed', { assignmentId, status: 'completed', message: 'Question paper generated!', progress: 100, generatedPaper });
  return { success: true };
}
export function createAssessmentWorker(socketIO?: any) {
  if (socketIO) io = socketIO;
  try {
    const queue = getAssessmentQueue();
    if (!queue) throw new Error('No queue');
    const worker = new Worker('assessment-generation', async (job: Job) => {
      try { return await processAssignment(job.data.assignmentId, job.id?.toString()); }
      catch (error: any) { await Assignment.findByIdAndUpdate(job.data.assignmentId, { status: 'failed', error: error.message }); notify('job:failed', { assignmentId: job.data.assignmentId, status: 'failed', message: error.message, progress: 0 }); throw error; }
    }, { connection: redisConfig, concurrency: 3 });
    worker.on('error', (err) => console.log('Worker error:', err.message));
    return worker;
  } catch { console.log('⚠️ BullMQ unavailable, using direct mode'); return null; }
}
