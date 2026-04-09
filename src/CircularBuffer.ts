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
    return this.slice(0);
  }

  public slice(start: number, end: number = this.count): T[] {
    if (this.count === 0) {
      return [];
    }

    if (start < 0) {
      start = Math.max(0, start + this.count);
    } else {
      start = Math.min(start, this.count);
    }

    if (end < 0) {
      end = Math.max(0, end + this.count);
    } else {
      end = Math.min(end, this.count);
    }

    if (end <= start) {
      return [];
    }

    const physStart = (this.start + start) % this.capacity;
    const physEnd = (this.start + end) % this.capacity;

    if (physEnd > physStart) {
      return this.buffer.slice(physStart, physEnd) as T[];
    }

    return (this.buffer.slice(physStart, this.capacity) as T[]).concat(
      this.buffer.slice(0, physEnd) as T[],
    );
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
