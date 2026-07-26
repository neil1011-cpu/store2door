/**
 * @fileOverview Genkit AI Initialization (Disabled for Manual Mode)
 */

export const ai = {
  defineFlow: (cfg: any, handler: any) => handler,
  definePrompt: (cfg: any) => async (input: any) => ({ output: null }),
  defineTool: (cfg: any, handler: any) => handler,
  generate: async (cfg: any) => ({ text: '', output: null, media: null }),
};

export const z = {
  object: (obj: any) => ({ describe: (s: string) => ({ infer: {} }) }),
  string: () => ({ describe: (s: string) => ({}) }),
  boolean: () => ({ describe: (s: string) => ({}) }),
  any: () => ({}),
  infer: {} as any,
};
