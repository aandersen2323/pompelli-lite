import type { Template } from './types.js';

export const TEMPLATES: Template[] = [
  {
    id: 'default',
    name: 'Concise summary',
    promptWrapper:
      'Summarize the following text in a concise paragraph while keeping key facts intact:',
    description: 'Short, factual summary with trimmed length.',
  },
  {
    id: 'playful',
    name: 'Playful remix',
    promptWrapper:
      'Rewrite the text with a playful tone, emoji as spice, and keep the core idea intact:',
    description: 'Casual and fun rewrite that still communicates the message.',
  },
  {
    id: 'technical',
    name: 'Technical brief',
    promptWrapper:
      'Reframe the content for a technical audience, focusing on specifications and constraints:',
    description: 'Engineering-friendly rewrite that emphasises mechanics.',
  },
  {
    id: 'prompt-generator',
    name: 'Image prompt generator',
    promptWrapper:
      'Turn this text into a descriptive image prompt for a diffusion model. Mention medium, lighting, and composition:',
    description: 'Transforms copy into a descriptive prompt for image models.',
  },
];

export function findTemplate(id: string): Template {
  const template = TEMPLATES.find((tpl) => tpl.id === id);
  return template ?? TEMPLATES[0];
}
