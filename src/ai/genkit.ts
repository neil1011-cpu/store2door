
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Official Genkit AI Initialization for FromStore2Door OS.
 * Provides a global 'ai' instance for GenAI flows and document analysis.
 */

export const ai = genkit({
  plugins: [
    googleAI(), // Add your provider plugin here
  ],
  model: googleAI.model('gemini-2.5-flash'), // Default high-performance model
});

export { z };
