import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Assignment from '../models/Assignment';
import { assessmentQueue } from '../services/queue';
import { redisClient } from '../services/queue';

const router = Router();

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and text files are allowed'));
    }
  }
});

// Create Assignment
router.post('/', upload.single('file'), async (req: Request, res: Response): Promise<any> => {
  try {
    const {
      title, subject, dueDate, questionTypes,
      numberOfQuestions, totalMarks, additionalInstructions, difficulty
    } = req.body;

    // Validation
    if (!title || !subject || !dueDate || !numberOfQuestions || !totalMarks) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: title, subject, dueDate, numberOfQuestions, totalMarks' 
      });
    }

    if (Number(numberOfQuestions) <= 0 || Number(totalMarks) <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'numberOfQuestions and totalMarks must be positive numbers' 
      });
    }

    const parsedTypes = typeof questionTypes === 'string' 
      ? JSON.parse(questionTypes) 
      : questionTypes || ['short_answer'];

    // Read file text if uploaded
    let fileText: string | undefined;
    let fileUrl: string | undefined;
    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      if (req.file.mimetype === 'text/plain') {
        fileText = fs.readFileSync(req.file.path, { encoding: 'utf-8' }) as string;
      }
    }

    // Create assignment in DB
    const assignment = await Assignment.create({
      title,
      subject,
      dueDate: new Date(dueDate),
      questionTypes: parsedTypes,
      numberOfQuestions: Number(numberOfQuestions),
      totalMarks: Number(totalMarks),
      additionalInstructions,
      difficulty: difficulty || 'mixed',
      fileUrl,
      fileText,
      status: 'pending'
    });

    // Add to BullMQ queue
    const job = await assessmentQueue.add('generate-assessment', {
      assignmentId: assignment._id.toString()
    }, {
      priority: 1
    });

    // Update with jobId
    await Assignment.findByIdAndUpdate(assignment._id, { jobId: job.id });

    // Cache assignment in Redis
    try {
      await redisClient.setEx(
        `assignment:${assignment._id}`,
        300, // 5 minutes
        JSON.stringify(assignment)
      );
    } catch (e) { /* Redis optional */ }

    res.status(201).json({
      success: true,
      data: {
        assignmentId: assignment._id,
        jobId: job.id,
        status: 'pending',
        message: 'Assignment created and queued for AI generation'
      }
    });
  } catch (error: any) {
    console.error('Create assignment error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all assignments
router.get('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const assignments = await Assignment.find()
      .select('-generatedPaper -fileText')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: assignments });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single assignment
router.get('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;

    // Try cache first
    try {
      const cached = await redisClient.get(`assignment:${id}`);
      if (cached && typeof cached === 'string') {
        const data = JSON.parse(cached);
        if (data.status === 'completed') {
          return res.json({ success: true, data, fromCache: true });
        }
      }
    } catch (e) { /* Redis optional */ }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    // Cache if completed
    if (assignment.status === 'completed') {
      try {
        await redisClient.setEx(`assignment:${id}`, 3600, JSON.stringify(assignment));
      } catch (e) { /* Redis optional */ }
    }

    res.json({ success: true, data: assignment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Regenerate assignment
router.post('/:id/regenerate', async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);
    
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }

    // Reset status
    await Assignment.findByIdAndUpdate(id, { 
      status: 'pending', 
      generatedPaper: undefined,
      error: undefined 
    });

    // Clear cache
    try {
      await redisClient.del(`assignment:${id}`);
    } catch (e) { /* Redis optional */ }

    // Add to queue
    const job = await assessmentQueue.add('generate-assessment', {
      assignmentId: id
    });

    await Assignment.findByIdAndUpdate(id, { jobId: job.id });

    res.json({ 
      success: true, 
      data: { assignmentId: id, jobId: job.id, status: 'pending' } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete assignment
router.delete('/:id', async (req: Request, res: Response): Promise<any> => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    try {
      await redisClient.del(`assignment:${req.params.id}`);
    } catch (e) { /* Redis optional */ }
    res.json({ success: true, message: 'Assignment deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
