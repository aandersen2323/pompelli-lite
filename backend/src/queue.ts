type QueueTask<T> = {
  id: string;
  payload: T;
  createdAt: number;
};

export type TaskHandler<T> = (payload: T) => Promise<void> | void;

/**
 * A tiny in-memory queue that processes jobs sequentially.
 * It is intentionally simple so it can be swapped for BullMQ/Redis later.
 */
export class InMemoryQueue<T> {
  private queue: QueueTask<T>[] = [];
  private running = false;

  constructor(private readonly handler: TaskHandler<T>) {}

  enqueue(id: string, payload: T) {
    this.queue.push({ id, payload, createdAt: Date.now() });
    this.process();
  }

  get size() {
    return this.queue.length;
  }

  private async process() {
    if (this.running) return;
    this.running = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift()!;
      try {
        await this.handler(task.payload);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Queue task ${task.id} failed`, error);
      }
    }

    this.running = false;

    // Handle the case where new tasks were enqueued while we were finishing
    // the previous batch. In that scenario enqueue() would have seen the queue
    // as "running" and returned early, so we need to kick the processor again
    // now that we are idle.
    if (this.queue.length > 0) {
      this.process();
    }
  }
}
