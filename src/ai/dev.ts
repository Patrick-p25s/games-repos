import { config } from 'dotenv';
config({ path: '.env.local' });

import '@/ai/flows/generate-quiz-questions.ts';
