'use server';
/**
 * @fileOverview Generates a delivery address suggestion from a receipt image.
 *
 * - generateDeliveryAddress - A function that handles the generation of delivery address.
 * - GenerateDeliveryAddressInput - The input type for the generateDeliveryAddress function.
 * - GenerateDeliveryAddressOutput - The return type for the generateDeliveryAddress function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDeliveryAddressInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo of a receipt or delivery slip, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' + 
      'The image should contain the delivery address.'
    ),
});
export type GenerateDeliveryAddressInput = z.infer<typeof GenerateDeliveryAddressInputSchema>;

const GenerateDeliveryAddressOutputSchema = z.object({
  suggestedDeliveryAddress: z.string().describe('The suggested delivery address extracted from the receipt image.'),
});
export type GenerateDeliveryAddressOutput = z.infer<typeof GenerateDeliveryAddressOutputSchema>;

export async function generateDeliveryAddress(input: GenerateDeliveryAddressInput): Promise<GenerateDeliveryAddressOutput> {
  return generateDeliveryAddressFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDeliveryAddressPrompt',
  input: {schema: GenerateDeliveryAddressInputSchema},
  output: {schema: GenerateDeliveryAddressOutputSchema},
  prompt: `You are an AI assistant specializing in extracting delivery addresses from images of receipts or delivery slips.

  Analyze the provided image and identify the delivery address. Provide the address in a clear and concise format.

  Image: {{media url=photoDataUri}}
  `,
});

const generateDeliveryAddressFlow = ai.defineFlow(
  {
    name: 'generateDeliveryAddressFlow',
    inputSchema: GenerateDeliveryAddressInputSchema,
    outputSchema: GenerateDeliveryAddressOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
