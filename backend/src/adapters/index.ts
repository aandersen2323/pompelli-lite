import type { Template } from '../types.js';
import { findTemplate } from '../templates.js';
import { createMockAdapter } from './llm-mock.js';
import { createOpenAIAdapter } from './llm-openai.js';

type Adapter = {
  generateVariations(input: string, template: Template, n: number): Promise<string[]>;
};

export function resolveAdapter(): Adapter {
  if (process.env.OPENAI_API_KEY) {
    return createOpenAIAdapter();
  }
  return createMockAdapter();
}

export async function generateWithAdapter(
  input: string,
  templateId: string,
  n: number,
): Promise<string[]> {
  const template = findTemplate(templateId);
  const adapter = resolveAdapter();
  return adapter.generateVariations(input, template, n);
}
