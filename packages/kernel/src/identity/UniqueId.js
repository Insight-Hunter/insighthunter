import { randomUUID } from "node:crypto";
export class UniqueId {
    raw;
    constructor(value) {
        this.raw = value ?? randomUUID();
    }
    static create(value) {
        return new UniqueId(value);
    }
    toString() {
        return this.raw;
    }
    equals(other) {
        return this.raw === other.raw;
    }
}
//# sourceMappingURL=UniqueId.js.map