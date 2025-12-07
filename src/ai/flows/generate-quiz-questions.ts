
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
  topic: z.string().describe('The topic of the quiz questions.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty of the quiz questions.'),
  numQuestions: z.number().int().min(1).max(15).default(5).describe('The number of quiz questions to generate.'),
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
  prompt: `You are a quiz question generator.  You will generate {{numQuestions}} quiz questions on the topic of {{{topic}}}. The difficulty of the questions should be {{{difficulty}}}.

Each question should have 4 possible answers, and one correct answer.

Your response should be a JSON object with a "questions" field. The "questions" field should be an array of objects. Each object in the array should have the following fields:
- "question": The quiz question.
- "options": An array of 4 strings, representing the possible answers to the question.
- "correctAnswerIndex": The index of the correct answer in the options array.

For example:
{
  "questions": [
    {
      "question": "What is the capital of France?",
      "options": ["London", "Paris", "Berlin", "Rome"],
      "correctAnswerIndex": 1
    },
    {
      "question": "What is the highest mountain in the world?",
      "options": ["Mount Everest", "K2", "Kangchenjunga", "Lhotse"],
      "correctAnswerIndex": 0
    }
  ]
}
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

    