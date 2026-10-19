import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * @fileOverview Official Genkit AI Initialization for FromStore2Door OS.
 * Provides a global 'ai' instance for GenAI flows and document analysis.
 * Hardened to disable telemetry which prevents build-time Jaeger resolution errors.
 */

export const ai = genkit({
  plugins: [
    googleAI(), 
  ],
  model: googleAI.model('gemini-2.5-flash'),
  // Explicitly disable telemetry to prevent build-time resolution errors for optional exporters
  telemetry: {
    disabled: true
  }
});

export { z };
