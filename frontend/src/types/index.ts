export type QuestionType = 'mcq' | 'short_answer' | 'long_answer' | 'true_false' | 'fill_blank';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type AssignmentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Question {
  id: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  type: QuestionType;
  options?: string[];
}

export interface Section {
  id: string;
  title: string;
  instruction: string;
  questions: Question[];
  totalMarks: number;
}

export interface GeneratedPaper {
  title: string;
  subject: string;
  totalMarks: number;
  duration: string;
  sections: Section[];
  generatedAt: string;
}

export interface Assignment {
  _id: string;
  title: string;
  subject: string;
  dueDate: string;
  questionTypes: QuestionType[];
  numberOfQuestions: number;
  totalMarks: number;
  additionalInstructions?: string;
  difficulty: Difficulty;
  fileUrl?: string;
  status: AssignmentStatus;
  jobId?: string;
  generatedPaper?: GeneratedPaper;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignmentFormData {
  title: string;
  subject: string;
  dueDate: string;
  questionTypes: QuestionType[];
  numberOfQuestions: number;
  totalMarks: number;
  additionalInstructions: string;
  difficulty: Difficulty;
  file?: File;
}

export interface JobProgress {
  assignmentId: string;
  status: AssignmentStatus;
  message: string;
  progress: number;
  generatedPaper?: GeneratedPaper;
}
