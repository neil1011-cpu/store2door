'use server';
/**
 * @fileOverview Generates a customs form and warehouse ticket from shipper input.
 * Refactored to handle secure S3 keys by automatically retrieving private documents.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { createAdminClient } from '@/lib/supabase/server';
import { getFileBuffer, VultrConfig } from '@/lib/integrations/vultr-service';

const GenerateCustomsFormInputSchema = z.object({
  trackingNumber: z.string().describe('The tracking number for the shipment, in JMXXX format.'),
  contentsDescription: z.string().describe('A description of the items in the package.'),
  weight: z.string().describe('The weight of the package, including units (e.g., lbs).'),
  invoiceDataUri: z
    .string()
    .describe(
      "A photo of a commercial invoice, as a data URI OR a secure S3 storage key. Format: 'data:<mimetype>;base64,<encoded_data>' or 'invoices/uid/filename'."
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
    let finalUri = input.invoiceDataUri;

    // Detect if input is an S3 key rather than a Data URI
    if (!finalUri.startsWith('data:') && !finalUri.startsWith('http')) {
        const adminClient = await createAdminClient();
        const { data: configData } = await adminClient
            .from('system_configs')
            .select('config_value')
            .eq('config_key', 'vultr_config')
            .maybeSingle();

        if (configData) {
            const config = configData.config_value as VultrConfig;
            const buffer = await getFileBuffer(config, input.invoiceDataUri);
            if (buffer) {
                // Determine mime type from extension
                const ext = input.invoiceDataUri.split('.').pop()?.toLowerCase();
                const mime = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
                finalUri = `data:${mime};base64,${buffer.toString('base64')}`;
            }
        }
    }

    const {output} = await prompt({
        ...input,
        invoiceDataUri: finalUri
    });
    return output!;
  }
);
