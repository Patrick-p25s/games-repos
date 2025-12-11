
'use server';

/**
 * @fileOverview A quiz question generation AI agent.
 *
 * - generateQuizQuestions - A function that handles the quiz question generation process.
 * - GenerateQuizQuestionsInput - The input type for the generateQuizQuestions function.
 * - GenerateQuizQuestionsOutput - The return type for the generateQuizQuestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateQuizQuestionsInputSchema = z.object({
  topic: z.string().default('General Knowledge').describe('The topic of the quiz questions.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('easy').describe('The difficulty of the quiz questions.'),
  numQuestions: z.number().int().min(5).max(15).default(10).describe('The number of quiz questions to generate.'),
});
export type GenerateQuizQuestionsInput = z.infer<typeof GenerateQuizQuestionsInputSchema>;

const QuizQuestionSchema = z.object({
  question: z.string().describe('The quiz question.'),
  options: z.array(z.string()).describe('The possible answer options for the question.'),
  correctAnswerIndex: z.number().int().min(0).describe('The index of the correct answer in the options array.'),
});

const GenerateQuizQuestionsOutputSchema = z.object({
  questions: z.array(QuizQuestionSchema).describe('The generated quiz questions.'),
});

export type GenerateQuizQuestionsOutput = z.infer<typeof GenerateQuizQuestionsOutputSchema>;

export async function generateQuizQuestions(input: GenerateQuizQuestionsInput): Promise<GenerateQuizQuestionsOutput> {
  return generateQuizQuestionsFlow(input);
}

const generateQuizQuestionsPrompt = ai.definePrompt({
  name: 'generateQuizQuestionsPrompt',
  input: {schema: GenerateQuizQuestionsInputSchema},
  output: {schema: GenerateQuizQuestionsOutputSchema},
  prompt: `You are a quiz question generator. Your task is to generate {{numQuestions}} quiz questions on the topic of {{{topic}}}. The difficulty of the questions should be {{{difficulty}}}.

Each question must have exactly 4 possible answer options. One of these must be the correct answer.

Your response must be a valid JSON object matching the specified schema. It should contain a "questions" field, which is an array of question objects. Each question object must have the following fields:
- "question": The quiz question as a string.
- "options": An array of exactly 4 strings, representing the possible answers.
- "correctAnswerIndex": The 0-based index of the correct answer within the "options" array.
`,
});

const generateQuizQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuizQuestionsFlow',
    inputSchema: GenerateQuizQuestionsInputSchema,
    outputSchema: GenerateQuizQuestionsOutputSchema,
  },
  async input => {
    const {output} = await generateQuizQuestionsPrompt(input);
    return output!;
  }
);
