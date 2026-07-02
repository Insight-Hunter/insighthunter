export class Result {
    _value;
    _error;
    _isOk;
    constructor(isOk, value, error) {
        this._isOk = isOk;
        this._value = value;
        this._error = error;
    }
    static ok(value) {
        return new Result(true, value);
    }
    static fail(error) {
        return new Result(false, undefined, error);
    }
    static try(fn) {
        try {
            return Result.ok(fn());
        }
        catch (error) {
            return Result.fail(error instanceof Error ? error : new Error("Unknown error."));
        }
    }
    isOk() {
        return this._isOk;
    }
    isFail() {
        return !this._isOk;
    }
    get value() {
        if (this.isFail()) {
            throw new Error("Cannot access value of failed result.");
        }
        return this._value;
    }
    get error() {
        if (this.isOk()) {
            throw new Error("Cannot access error of successful result.");
        }
        return this._error;
    }
    map(mapper) {
        return this.isOk() ? Result.ok(mapper(this.value)) : Result.fail(this.error);
    }
    flatMap(mapper) {
        return this.isOk() ? mapper(this.value) : Result.fail(this.error);
    }
    mapError(mapper) {
        return this.isOk() ? Result.ok(this.value) : Result.fail(mapper(this.error));
    }
    match(handlers) {
        return this.isOk() ? handlers.ok(this.value) : handlers.fail(this.error);
    }
    getOrElse(fallback) {
        return this.isOk() ? this.value : fallback;
    }
    getOrThrow(mapper) {
        if (this.isOk()) {
            return this.value;
        }
        if (mapper) {
            throw mapper(this.error);
        }
        throw this.error instanceof Error
            ? this.error
            : new Error("Result failed.");
    }
    tap(effect) {
        if (this.isOk()) {
            effect(this.value);
        }
        return this;
    }
    tapError(effect) {
        if (this.isFail()) {
            effect(this.error);
        }
        return this;
    }
    static all(results) {
        const values = [];
        for (const result of results) {
            if (result.isFail()) {
                return Result.fail(result.error);
            }
            values.push(result.value);
        }
        return Result.ok(values);
    }
}
//# sourceMappingURL=Result.js.map