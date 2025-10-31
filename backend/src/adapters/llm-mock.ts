import type { Template } from '../types.js';

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const playfulSuffixes = ['😄', '🎉', '🚀', '✨'];
const concisePrefixes = ['TL;DR', 'In short', 'Summary'];

export function createMockAdapter() {
  return {
    async generateVariations(input: string, template: Template, n: number) {
      const results: string[] = [];
      for (let i = 0; i < n; i += 1) {
        const variation = transform(input, template, i);
        results.push(variation);
        await delay();
      }
      return results;
    },
  };
}

function transform(input: string, template: Template, index: number) {
  const trimmed = input.trim();
  switch (template.id) {
    case 'playful':
      return `${template.name}: ${trimmed} ${pick(playfulSuffixes)} [v${index + 1}]`;
    case 'technical':
      return `${template.name}: ${extractKeywords(trimmed).join(', ')} [v${index + 1}]`;
    case 'prompt-generator':
      return `${template.name}: ${generatePrompt(trimmed)} [v${index + 1}]`;
    default:
      return `${pick(concisePrefixes)}: ${trimmed.slice(0, 200)} [v${index + 1}]`;
  }
}

function extractKeywords(input: string) {
  return input
    .split(/\W+/)
    .filter((word) => word.length > 4)
    .slice(0, 12);
}

function generatePrompt(input: string) {
  return `${input} | cinematic lighting | ultra-detailed | 35mm film`;
}

function delay() {
  return new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 120));
}

export type MockAdapter = ReturnType<typeof createMockAdapter>;
