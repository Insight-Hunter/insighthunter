export class SystemClock {
  now() {
    return new Date();
  }
}
export class FixedClock {
  instant;
  constructor(instant) {
    this.instant = new Date(instant);
  }
  now() {
    return new Date(this.instant);
  }
}
//# sourceMappingURL=Clock.js.map
