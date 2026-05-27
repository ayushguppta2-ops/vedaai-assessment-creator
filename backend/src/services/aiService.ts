import Anthropic from '@anthropic-ai/sdk';
import { IGeneratedPaper, ISection, IQuestion } from '../models/Assignment';
import { v4 as uuidv4 } from 'uuid';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

interface AssignmentInput {
  title: string;
  subject: string;
  questionTypes: string[];
  numberOfQuestions: number;
  totalMarks: number;
  difficulty: string;
  additionalInstructions?: string;
  fileText?: string;
}

function buildPrompt(input: AssignmentInput): string {
  const questionTypeMap: Record<string, string> = {
    mcq: 'Multiple Choice Questions (with 4 options each)',
    short_answer: 'Short Answer Questions (2-3 sentences)',
    long_answer: 'Long Answer/Essay Questions',
    true_false: 'True or False Questions',
    fill_blank: 'Fill in the Blank Questions'
  };

  const typeDescriptions = input.questionTypes
    .map(t => questionTypeMap[t] || t)
    .join(', ');

  const difficultyInstruction = input.difficulty === 'mixed'
    ? 'Mix difficulty levels: approximately 40% easy, 40% medium, 20% hard'
    : `All questions should be ${input.difficulty} difficulty`;

  let contextSection = '';
  if (input.fileText) {
    contextSection = `\n\nREFERENCE MATERIAL (base questions on this content):\n${input.fileText.substring(0, 3000)}`;
  }

  return `You are an expert teacher creating a professional exam question paper.

ASSIGNMENT DETAILS:
- Title: ${input.title}
- Subject: ${input.subject}
- Total Questions: ${input.numberOfQuestions}
- Total Marks: ${input.totalMarks}
- Question Types: ${typeDescriptions}
- Difficulty: ${difficultyInstruction}
${input.additionalInstructions ? `- Special Instructions: ${input.additionalInstructions}` : ''}
${contextSection}

Create a structured question paper organized into logical sections (Section A, Section B, etc.) based on question types.

CRITICAL: Respond ONLY with a valid JSON object. No markdown, no explanations, no code blocks. Just raw JSON.

JSON Structure:
{
  "title": "exam title",
  "subject": "subject name",
  "totalMarks": number,
  "duration": "X hours Y minutes",
  "sections": [
    {
      "title": "Section A",
      "instruction": "Attempt all questions",
      "questions": [
        {
          "text": "question text here",
          "difficulty": "easy|medium|hard",
          "marks": number,
          "type": "mcq|short_answer|long_answer|true_false|fill_blank",
          "options": ["A. option1", "B. option2", "C. option3", "D. option4"]
        }
      ]
    }
  ]
}

RULES:
1. Distribute ${input.numberOfQuestions} questions across sections by type
2. Total marks must equal exactly ${input.totalMarks}
3. For MCQs, always include 4 options array
4. For other types, omit the options field
5. Make questions academically rigorous and subject-appropriate
6. Write clear, unambiguous question text
7. Ensure proper marks distribution (easy=1-2, medium=3-5, hard=6-10 marks typically)
8. Return ONLY valid JSON, nothing else`;
}

export async function generateAssessment(input: AssignmentInput): Promise<IGeneratedPaper> {
  const prompt = buildPrompt(input);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Parse and validate the JSON response
  let rawData: any;
  try {
    // Clean up any potential markdown fences
    const cleaned = responseText
      .replace(/```json\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();
    rawData = JSON.parse(cleaned);
  } catch (e) {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  // Validate and structure the response
  const sections: ISection[] = rawData.sections.map((section: any) => {
    const questions: IQuestion[] = section.questions.map((q: any) => ({
      id: uuidv4(),
      text: q.text || 'Question text',
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      marks: Number(q.marks) || 1,
      type: q.type || 'short_answer',
      options: q.options || undefined
    }));

    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

    return {
      id: uuidv4(),
      title: section.title || 'Section',
      instruction: section.instruction || 'Attempt all questions',
      questions,
      totalMarks
    };
  });

  const paper: IGeneratedPaper = {
    title: rawData.title || input.title,
    subject: rawData.subject || input.subject,
    totalMarks: sections.reduce((sum, s) => sum + s.totalMarks, 0),
    duration: rawData.duration || '2 hours',
    sections,
    generatedAt: new Date()
  };

  return paper;
}
