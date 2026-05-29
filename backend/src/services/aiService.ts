import { GoogleGenerativeAI } from '@google/generative-ai';
import { IGeneratedPaper, ISection, IQuestion } from '../models/Assignment';
import { v4 as uuidv4 } from 'uuid';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface AssignmentInput {
  title: string; subject: string; questionTypes: string[];
  numberOfQuestions: number; totalMarks: number; difficulty: string;
  additionalInstructions?: string; fileText?: string;
}

export async function generateAssessment(input: AssignmentInput): Promise<IGeneratedPaper> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `You are an expert teacher creating a professional exam question paper.
ASSIGNMENT: Title: ${input.title}, Subject: ${input.subject}, Questions: ${input.numberOfQuestions}, Marks: ${input.totalMarks}, Difficulty: ${input.difficulty}, Types: ${input.questionTypes.join(', ')}
${input.additionalInstructions ? `Instructions: ${input.additionalInstructions}` : ''}

Respond ONLY with valid JSON, no markdown, no explanation:
{"title":"exam title","subject":"subject","totalMarks":${input.totalMarks},"duration":"X hours","sections":[{"title":"Section A","instruction":"Attempt all questions","questions":[{"text":"question text","difficulty":"easy","marks":2,"type":"mcq","options":["A. opt1","B. opt2","C. opt3","D. opt4"]}]}]}

Rules: distribute exactly ${input.numberOfQuestions} questions, total marks must equal ${input.totalMarks}, MCQs need 4 options, other types omit options field. Return ONLY JSON.`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  let rawData: any;
  try {
    const cleaned = responseText.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();
    rawData = JSON.parse(cleaned);
  } catch {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) rawData = JSON.parse(jsonMatch[0]);
    else throw new Error('Failed to parse AI response');
  }

  const sections: ISection[] = rawData.sections.map((section: any) => {
    const questions: IQuestion[] = section.questions.map((q: any) => ({
      id: uuidv4(), text: q.text || 'Question',
      difficulty: ['easy','medium','hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      marks: Number(q.marks) || 1, type: q.type || 'short_answer', options: q.options
    }));
    return { id: uuidv4(), title: section.title, instruction: section.instruction, questions, totalMarks: questions.reduce((s, q) => s + q.marks, 0) };
  });

  return { title: rawData.title || input.title, subject: rawData.subject || input.subject, totalMarks: sections.reduce((s, sec) => s + sec.totalMarks, 0), duration: rawData.duration || '2 hours', sections, generatedAt: new Date() };
}
