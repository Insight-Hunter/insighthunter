export class SystemClock {
    now() {
        return new Date();
    }
    nowIso() {
        return this.now().toISOString();
    }
}
export class FixedClock {
    value;
    constructor(value) {
        this.value = value;
    }
    now() {
        return new Date(this.value);
    }
    nowIso() {
        return this.value.toISOString();
    }
}
//# sourceMappingURL=clock.js.map