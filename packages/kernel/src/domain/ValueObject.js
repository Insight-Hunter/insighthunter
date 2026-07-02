function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const key of Object.keys(value)) {
            const nested = value[key];
            if (nested && typeof nested === "object") {
                deepFreeze(nested);
            }
        }
    }
    return value;
}
export class ValueObject {
    props;
    constructor(props) {
        this.props = deepFreeze(structuredClone(props));
    }
    equals(other) {
        return JSON.stringify(this.props) === JSON.stringify(other.props);
    }
    unpack() {
        return this.props;
    }
}
//# sourceMappingURL=ValueObject.js.map