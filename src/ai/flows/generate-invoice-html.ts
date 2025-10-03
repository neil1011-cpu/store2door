'use server';
/**
 * @fileOverview Generates an HTML invoice from structured data.
 *
 * - generateInvoiceHtml - A function that handles the generation of the invoice HTML.
 * - GenerateInvoiceHtmlInput - The input type for the generateInvoiceHtml function.
 * - GenerateInvoiceHtmlOutput - The return type for the generateInvoiceHtml function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const LineItemSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  price: z.number(),
});

const GenerateInvoiceHtmlInputSchema = z.object({
  invoiceId: z.string().describe("The unique ID for the invoice."),
  customerName: z.string().describe("The name of the customer."),
  invoiceDate: z.string().describe("The date the invoice was issued."),
  lineItems: z.array(LineItemSchema).describe("An array of line items for the invoice."),
  totalAmount: z.number().describe("The total amount for the invoice."),
});
export type GenerateInvoiceHtmlInput = z.infer<typeof GenerateInvoiceHtmlInputSchema>;

const GenerateInvoiceHtmlOutputSchema = z.object({
  html: z.string().describe("The generated HTML content for the invoice."),
});
export type GenerateInvoiceHtmlOutput = z.infer<typeof GenerateInvoiceHtmlOutputSchema>;


export async function generateInvoiceHtml(input: GenerateInvoiceHtmlInput): Promise<GenerateInvoiceHtmlOutput> {
  return generateInvoiceHtmlFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateInvoiceHtmlPrompt',
  input: {schema: GenerateInvoiceHtmlInputSchema},
  output: {schema: GenerateInvoiceHtmlOutputSchema},
  prompt: `You are an expert HTML and CSS developer. Your task is to generate a professional, clean, and well-structured HTML document for a shipping invoice.
The HTML should use inline CSS for styling to ensure it renders correctly when converted to a PDF. Do not use any external stylesheets or images.

Use a professional and modern design. The invoice should include the company name "FromStore2Door", the customer's details, the invoice ID, date, a table for the line items, and the total amount.

Here is the data to include:
- Company Name: FromStore2Door
- Invoice ID: {{{invoiceId}}}
- Customer Name: {{{customerName}}}
- Invoice Date: {{{invoiceDate}}}
- Total Amount: {{{totalAmount}}}

- Line Items:
{{#each lineItems}}
- Description: {{this.description}}, Quantity: {{this.quantity}}, Price: {{this.price}}
{{/each}}

Please generate only the full HTML code, starting with <!DOCTYPE html> and ending with </html>.
`,
});

const generateInvoiceHtmlFlow = ai.defineFlow(
  {
    name: 'generateInvoiceHtmlFlow',
    inputSchema: GenerateInvoiceHtmlInputSchema,
    outputSchema: GenerateInvoiceHtmlOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    