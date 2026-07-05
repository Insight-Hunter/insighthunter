export interface Clock {
  now(): Date;
  nowIso(): string;
}
export declare class SystemClock implements Clock {
  now(): Date;
  nowIso(): string;
}
export declare class FixedClock implements Clock {
  private readonly value;
  constructor(value: Date);
  now(): Date;
  nowIso(): string;
}
