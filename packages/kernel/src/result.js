export function ok(value) {
    return { ok: true, value };
}
export function err(error) {
    return { ok: false, error };
}
export function isOk(result) {
    return result.ok;
}
export function isErr(result) {
    return !result.ok;
}
export function unwrap(result) {
    if (result.ok) {
        return result.value;
    }
    throw result.error;
}
export function mapResult(result, mapper) {
    if (!result.ok) {
        return result;
    }
    return ok(mapper(result.value));
}
//# sourceMappingURL=result.js.map