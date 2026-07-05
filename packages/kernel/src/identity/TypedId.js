import { UniqueId } from "./UniqueId.js";
export class TypedId extends UniqueId {
  kind;
  constructor(kind, value) {
    super(value);
    this.kind = kind;
  }
  static create(kind, value) {
    return new TypedId(kind, value);
  }
  toString() {
    return super.toString();
  }
  equals(other) {
    return this.kind === other.kind && super.equals(other);
  }
}
//# sourceMappingURL=TypedId.js.map
