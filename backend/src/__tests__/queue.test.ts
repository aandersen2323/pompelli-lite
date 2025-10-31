import { describe, expect, it } from 'vitest';
import { InMemoryQueue } from '../queue.js';

function createDelay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('InMemoryQueue', () => {
  it('processes jobs sequentially', async () => {
    const processed: number[] = [];
    const queue = new InMemoryQueue<number>(async (value) => {
      await createDelay(5);
      processed.push(value);
    });

    [1, 2, 3, 4].forEach((value) => queue.enqueue(String(value), value));
    await createDelay(100);
    expect(processed).toEqual([1, 2, 3, 4]);
  });

  it('continues processing after handler failure', async () => {
    const processed: number[] = [];
    let first = true;
    const queue = new InMemoryQueue<number>(async (value) => {
      await createDelay(5);
      if (first) {
        first = false;
        throw new Error('Boom');
      }
      processed.push(value);
    });

    queue.enqueue('1', 1);
    queue.enqueue('2', 2);
    queue.enqueue('3', 3);

    await createDelay(100);
    expect(processed).toEqual([2, 3]);
  });
});
