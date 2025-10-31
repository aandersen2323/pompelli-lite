import type { Template } from '../types.js';

export function createOpenAIAdapter() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for the OpenAI adapter');
  }

  return {
    async generateVariations(input: string, template: Template, n: number) {
      // Placeholder implementation to keep the build working locally.
      // Replace this with an actual OpenAI client call, e.g. using openai npm package.
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not provided');
      }

      // Example skeleton: this is intentionally not making a network call.
      // Developers can plug in their preferred SDK here.
      const pseudoResponse = Array.from({ length: n }, (_, index) =>
        `${template.name} (OpenAI placeholder) [v${index + 1}]: ${input}`,
      );

      return pseudoResponse;
    },
  };
}
