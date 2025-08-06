'use server';
/**
 * @fileOverview Generates a customs form and warehouse ticket from shipper input.
 *
 * - generateCustomsForm - A function that handles the generation of shipping documents.
 * - GenerateCustomsFormInput - The input type for the generateCustomsForm function.
 * - GenerateCustomsFormOutput - The return type for the generateCustomsForm function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCustomsFormInputSchema = z.object({
  trackingNumber: z.string().describe('The tracking number for the shipment, in JMXXX format.'),
  contentsDescription: z.string().describe('A description of the items in the package.'),
  weight: z.string().describe('The weight of the package, including units (e.g., lbs).'),
  invoiceDataUri: z
    .string()
    .describe(
      'The commercial invoice for the shipment, as a data URI that must include a MIME type and use Base64 encoding.'
    ),
});
export type GenerateCustomsFormInput = z.infer<typeof GenerateCustomsFormInputSchema>;

const GenerateCustomsFormOutputSchema = z.object({
  customsForm: z.object({
      trackingNumber: z.string().describe('The tracking number for the shipment.'),
      contentsDescription: z.string().describe('The description of the package contents.'),
      weight: z.string().describe('The weight of the package.'),
      sender: z.string().describe('The full name and address of the sender, extracted from the invoice.'),
      recipient: z.string().describe('The full name and address of the recipient, extracted from the invoice.'),
  }).describe("The generated Jamaica customs form details."),
  warehouseTicket: z.object({
      ticketId: z.string().describe("A unique identifier for the warehouse intake ticket, in the format TICKET-XXXX."),
      trackingNumber: z.string().describe('The tracking number for the shipment.'),
      status: z.string().describe("The initial status of the package in the warehouse, which should be 'Pre-Alert'"),
  }).describe("The generated warehouse intake ticket.")
});
export type GenerateCustomsFormOutput = z.infer<typeof GenerateCustomsFormOutputSchema>;


export async function generateCustomsForm(input: GenerateCustomsFormInput): Promise<GenerateCustomsFormOutput> {
  return generateCustomsFormFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCustomsFormPrompt',
  input: {schema: GenerateCustomsFormInputSchema},
  output: {schema: GenerateCustomsFormOutputSchema},
  prompt: `You are an AI assistant for a courier service that ships packages from Florida, USA to Jamaica.
  Your task is to generate a Jamaica customs form and a warehouse intake ticket based on the information provided by the shipper.

  The tracking number is: {{{trackingNumber}}}
  The contents are: {{{contentsDescription}}}
  The weight is: {{{weight}}}

  The commercial invoice is attached. Analyze the invoice to extract the sender's and recipient's full name and address.
  Invoice: {{media url=invoiceDataUri}}

  Generate a unique ticket ID for the warehouse in the format TICKET-XXXX, where XXXX is a random 4-digit number.
  The initial status for the warehouse ticket must be "Pre-Alert".

  Return the structured data for the customs form and the warehouse ticket.
  `,
});

const generateCustomsFormFlow = ai.defineFlow(
  {
    name: 'generateCustomsFormFlow',
    inputSchema: GenerateCustomsFormInputSchema,
    outputSchema: GenerateCustomsFormOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
