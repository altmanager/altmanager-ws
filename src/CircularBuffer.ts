export class CircularBuffer<T> implements Iterable<T> {
  private readonly buffer: (T | undefined)[];
  private start = 0;
  private count = 0;

  public readonly capacity: number;

  public constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error("Capacity must be > 0");
    }
    this.capacity = capacity;
    this.buffer = new Array<T | undefined>(capacity);
  }

  public add(item: T): void {
    const end = this.mapIndex(this.count);
    this.buffer[end] = item;
    if (this.count < this.capacity) {
      this.count++;
    } else {
      this.start = (this.start + 1) % this.capacity;
    }
  }

  public pop(): T | undefined {
    if (this.count === 0) {
      return undefined;
    }
    const item = this.buffer[this.start];
    this.buffer[this.start] = undefined;
    this.start = (this.start + 1) % this.capacity;
    this.count--;
    return item;
  }

  public size(): number {
    return this.count;
  }

  public at(index: number): T | undefined {
    if (this.count === 0) return undefined;
    if (index < 0) index += this.count;
    if (index < 0 || index >= this.count) return undefined;
    return this.buffer[this.mapIndex(index)]!;
  }

  public getAll(): T[] {
    return Array.from(this);
  }

  public [Symbol.iterator](): Iterator<T> {
    let idx = 0;
    return {
      next: (): IteratorResult<T> => {
        if (idx >= this.count) {
          return { done: true, value: undefined };
        }
        const value = this.buffer[this.mapIndex(idx)]!;
        idx++;
        return { done: false, value };
      },
    };
  }

  private mapIndex(index: number): number {
    return (this.start + index) % this.capacity;
  }
}
