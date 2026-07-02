export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  public now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  private readonly instant: Date;

  public constructor(instant: Date) {
    this.instant = new Date(instant);
  }

  public now(): Date {
    return new Date(this.instant);
  }
}
