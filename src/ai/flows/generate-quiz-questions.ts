
'use server';

/**
 * @fileOverview Defines an AI flow for generating quiz questions using Genkit.
 *
 * This file contains the full implementation for a Genkit flow that takes a topic,
 * difficulty, and number of questions as input, and returns a structured JSON object
 * containing the generated quiz questions, options, and correct answers.
 *
 * - generateQuizQuestions: The main function exported to be used by the application.
 * - GenerateQuizQuestionsInput: The Zod schema defining the input shape.
 * - GenerateQuizQuestionsOutput: The Zod schema defining the output shape.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// 1. Define the Input Schema using Zod.
// This schema validates the input for the AI flow. It specifies the expected
// data types, default values, and descriptions for each field.
const GenerateQuizQuestionsInputSchema = z.object({
  topic: z.string().default('General Knowledge').describe('The topic of the quiz questions.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('easy').describe('The difficulty of the quiz questions.'),
  numQuestions: z.number().int().min(5).max(15).default(10).describe('The number of quiz questions to generate.'),
});
// Export the TypeScript type inferred from the Zod schema.
export type GenerateQuizQuestionsInput = z.infer<typeof GenerateQuizQuestionsInputSchema>;


// 2. Define the Output Schema using Zod.
// This schema defines the structure of the JSON object that the AI model is expected
// to return. It ensures the output is consistent and can be reliably parsed.
const QuizQuestionSchema = z.object({
  question: z.string().describe('The quiz question.'),
  options: z.array(z.string()).describe('The possible answer options for the question.'),
  correctAnswerIndex: z.number().int().min(0).describe('The index of the correct answer in the options array.'),
});

const GenerateQuizQuestionsOutputSchema = z.object({
  questions: z.array(QuizQuestionSchema).describe('The generated quiz questions.'),
});
// Export the TypeScript type inferred from the Zod schema.
export type GenerateQuizQuestionsOutput = z.infer<typeof GenerateQuizQuestionsOutputSchema>;


// 3. Define the AI Prompt.
// This is the core instruction given to the Gemini model.
// - `name`: A unique identifier for the prompt.
// - `input` / `output`: These schemas tell the model what kind of data it will receive
//   and what format it should return.
// - `prompt`: The natural language instructions for the model. The `{{...}}` syntax
//   is Handlebars templating, which injects the input values into the prompt.
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

// 4. Define the Genkit Flow.
// A flow is an executable function that orchestrates AI calls and other logic.
// This flow takes the validated input, calls the prompt, and returns the structured output.
const generateQuizQuestionsFlow = ai.defineFlow(
  {
    name: 'generateQuizQuestionsFlow',
    inputSchema: GenerateQuizQuestionsInputSchema,
    outputSchema: GenerateQuizQuestionsOutputSchema,
  },
  async input => {
    // Call the prompt with the given input and wait for the response.
    const {output} = await generateQuizQuestionsPrompt(input);
    // The output is already parsed as a JSON object thanks to the schema.
    return output!;
  }
);


// 5. Export a Server Action Wrapper.
// This is the function that the Next.js frontend will call. It's an async
// function that acts as a simple wrapper around the Genkit flow.
export async function generateQuizQuestions(input: GenerateQuizQuestionsInput): Promise<GenerateQuizQuestionsOutput> {
  return generateQuizQuestionsFlow(input);
}
