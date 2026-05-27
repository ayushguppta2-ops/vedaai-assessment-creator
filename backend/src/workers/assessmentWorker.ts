import { Worker, Job } from 'bullmq';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { redisConfig } from '../services/queue';
import { generateAssessment } from '../services/aiService';
import Assignment from '../models/Assignment';

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vedaai');
    console.log('✅ Worker MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

let io: any = null;

export function setSocketIO(socketIO: any) {
  io = socketIO;
}

export function createAssessmentWorker(socketIO?: any) {
  if (socketIO) io = socketIO;

  const worker = new Worker(
    'assessment-generation',
    async (job: Job) => {
      const { assignmentId } = job.data;
      console.log(`🔄 Processing job ${job.id} for assignment ${assignmentId}`);

      try {
        // Update status to processing
        await Assignment.findByIdAndUpdate(assignmentId, { 
          status: 'processing',
          jobId: job.id 
        });

        // Notify frontend via WebSocket
        if (io) {
          io.to(assignmentId).emit('job:progress', {
            assignmentId,
            status: 'processing',
            message: 'AI is generating your question paper...',
            progress: 20
          });
        }

        // Fetch assignment data
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) throw new Error('Assignment not found');

        // Update progress
        if (io) {
          io.to(assignmentId).emit('job:progress', {
            assignmentId,
            status: 'processing',
            message: 'Structuring questions and sections...',
            progress: 50
          });
        }

        // Generate assessment
        const generatedPaper = await generateAssessment({
          title: assignment.title,
          subject: assignment.subject,
          questionTypes: assignment.questionTypes,
          numberOfQuestions: assignment.numberOfQuestions,
          totalMarks: assignment.totalMarks,
          difficulty: assignment.difficulty,
          additionalInstructions: assignment.additionalInstructions,
          fileText: assignment.fileText
        });

        // Update progress
        if (io) {
          io.to(assignmentId).emit('job:progress', {
            assignmentId,
            status: 'processing',
            message: 'Finalizing question paper...',
            progress: 80
          });
        }

        // Save generated paper
        await Assignment.findByIdAndUpdate(assignmentId, {
          status: 'completed',
          generatedPaper
        });

        // Notify completion
        if (io) {
          io.to(assignmentId).emit('job:completed', {
            assignmentId,
            status: 'completed',
            message: 'Question paper generated successfully!',
            progress: 100,
            generatedPaper
          });
        }

        console.log(`✅ Job ${job.id} completed for assignment ${assignmentId}`);
        return { success: true, assignmentId };

      } catch (error: any) {
        console.error(`❌ Job ${job.id} failed:`, error.message);

        await Assignment.findByIdAndUpdate(assignmentId, {
          status: 'failed',
          error: error.message
        });

        if (io) {
          io.to(assignmentId).emit('job:failed', {
            assignmentId,
            status: 'failed',
            message: error.message || 'Generation failed. Please try again.',
            progress: 0
          });
        }

        throw error;
      }
    },
    { 
      connection: redisConfig,
      concurrency: 3
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.log(`Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}

// Standalone worker mode
if (require.main === module) {
  connectDB().then(() => {
    createAssessmentWorker();
    console.log('🚀 Assessment Worker started');
  });
}
