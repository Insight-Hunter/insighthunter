export interface Clock {
  now(): Date;
  nowIso(): string;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }

  nowIso(): string {
    return this.now().toISOString();
  }
}

export class FixedClock implements Clock {
  constructor(private readonly value: Date) {}

  now(): Date {
    return new Date(this.value);
  }

  nowIso(): string {
    return this.value.toISOString();
  }
}
