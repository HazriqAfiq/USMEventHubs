'use server';

/**
 * @fileOverview Generates keyword suggestions for an event based on its title and description.
 *
 * - suggestEventKeywords - A function that suggests keywords for an event.
 * - SuggestEventKeywordsInput - The input type for the suggestEventKeywords function.
 * - SuggestEventKeywordsOutput - The return type for the suggestEventKeywords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestEventKeywordsInputSchema = z.object({
  title: z.string().describe('The title of the event.'),
  description: z.string().describe('The description of the event.'),
});
export type SuggestEventKeywordsInput = z.infer<
  typeof SuggestEventKeywordsInputSchema
>;

const SuggestEventKeywordsOutputSchema = z.object({
  keywords: z
    .array(z.string())
    .describe('An array of suggested keywords for the event.'),
});
export type SuggestEventKeywordsOutput = z.infer<
  typeof SuggestEventKeywordsOutputSchema
>;

export async function suggestEventKeywords(
  input: SuggestEventKeywordsInput
): Promise<SuggestEventKeywordsOutput> {
  return suggestEventKeywordsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestEventKeywordsPrompt',
  input: {schema: SuggestEventKeywordsInputSchema},
  output: {schema: SuggestEventKeywordsOutputSchema},
  prompt: `You are an expert in identifying relevant keywords for events. Given the event title and description, suggest a list of keywords that will improve the event\'s discoverability.\n\nTitle: {{{title}}}\nDescription: {{{description}}}\n\nKeywords (comma separated):`,
});

const suggestEventKeywordsFlow = ai.defineFlow(
  {
    name: 'suggestEventKeywordsFlow',
    inputSchema: SuggestEventKeywordsInputSchema,
    outputSchema: SuggestEventKeywordsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
