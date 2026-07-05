export class Maybe {
  value;
  constructor(value) {
    this.value = value;
  }
  static some(value) {
    if (value === null || value === undefined) {
      throw new TypeError("Cannot create Some from null or undefined.");
    }
    return new Maybe(value);
  }
  static none() {
    return new Maybe(undefined);
  }
  static fromNullable(value) {
    return value === null || value === undefined ? Maybe.none() : Maybe.some(value);
  }
  isSome() {
    return this.value !== null && this.value !== undefined;
  }
  isNone() {
    return !this.isSome();
  }
  map(mapper) {
    return this.isSome() ? Maybe.fromNullable(mapper(this.value)) : Maybe.none();
  }
  flatMap(mapper) {
    return this.isSome() ? mapper(this.value) : Maybe.none();
  }
  match(handlers) {
    return this.isSome() ? handlers.some(this.value) : handlers.none();
  }
  getOrElse(fallback) {
    return this.isSome() ? this.value : fallback;
  }
  getOrThrow(message = "Expected value to be present.") {
    if (this.isNone()) {
      throw new Error(message);
    }
    return this.value;
  }
  toNullable() {
    return this.isSome() ? this.value : null;
  }
}
//# sourceMappingURL=Maybe.js.map
