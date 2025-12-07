
'use server';
/**
 * @fileOverview Dynamically tailors quiz difficulty and topics based on player performance history.
 *
 * - tailorQuizDifficulty - A function that adjusts quiz parameters based on user data.
 * - TailorQuizDifficultyInput - The input type for the tailorQuizDifficulty function.
 * - TailorQuizDifficultyOutput - The return type for the tailorQuizDifficulty function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TailorQuizDifficultyInputSchema = z.object({
  playerHistory: z.string().describe('The player performance history.'),
});
export type TailorQuizDifficultyInput = z.infer<typeof TailorQuizDifficultyInputSchema>;

const TailorQuizDifficultyOutputSchema = z.object({
  topic: z.string().describe('The topic of the quiz.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the quiz (easy, medium, or hard).'),
});
export type TailorQuizDifficultyOutput = z.infer<typeof TailorQuizDifficultyOutputSchema>;

export async function tailorQuizDifficulty(input: TailorQuizDifficultyInput): Promise<TailorQuizDifficultyOutput> {
  const result = await tailorQuizDifficultyFlow(input);
  // Ensure difficulty is lowercase, just in case the model doesn't follow instructions.
  result.difficulty = result.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard';
  return result;
}

const prompt = ai.definePrompt({
  name: 'tailorQuizDifficultyPrompt',
  input: {schema: TailorQuizDifficultyInputSchema},
  output: {schema: TailorQuizDifficultyOutputSchema},
  prompt: `Based on the player's history: {{{playerHistory}}}, determine the appropriate topic and difficulty for the next quiz.

Consider the player's strengths and weaknesses to suggest a quiz topic that is appropriate for them. Also, use the history to determine the
level of difficulty. The difficulty must be one of: 'easy', 'medium', or 'hard'.

{{output}}
`,
});

const tailorQuizDifficultyFlow = ai.defineFlow(
  {
    name: 'tailorQuizDifficultyFlow',
    inputSchema: TailorQuizDifficultyInputSchema,
    outputSchema: TailorQuizDifficultyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
