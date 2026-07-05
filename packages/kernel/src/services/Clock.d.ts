export interface Clock {
  now(): Date;
}
export declare class SystemClock implements Clock {
  now(): Date;
}
export declare class FixedClock implements Clock {
  private readonly instant;
  constructor(instant: Date);
  now(): Date;
}
