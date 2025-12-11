/**
 * @file This file is the entry point for the Genkit development server.
 * It imports the necessary environment configuration and the AI flows
 * that need to be available for inspection and testing in the Genkit UI.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

// Import the quiz generation flow to make it available to the dev server.
import '@/ai/flows/generate-quiz-questions.ts';
