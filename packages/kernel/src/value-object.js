import { InvariantViolationError } from "./errors.js";
export class ValueObject {
    props;
    constructor(props) {
        this.props = props;
        Object.freeze(this.props);
    }
    equals(other) {
        return stableStringify(this.props) === stableStringify(other.props);
    }
    toJSON() {
        return this.props;
    }
}
export function assertInvariant(condition, message) {
    if (!condition) {
        throw new InvariantViolationError(message);
    }
}
function stableStringify(value) {
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    if (value !== null && typeof value === "object") {
        const record = value;
        const keys = Object.keys(record).sort();
        return `{${keys.map((key) => `${key}:${stableStringify(record[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
}
//# sourceMappingURL=value-object.js.map