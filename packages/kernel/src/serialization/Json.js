const BIGINT_PREFIX = "__bigint__:";
export function stringifyJson(value) {
  return JSON.stringify(value, (_, currentValue) => {
    return typeof currentValue === "bigint"
      ? `${BIGINT_PREFIX}${currentValue.toString()}`
      : currentValue;
  });
}
export function parseJson(value) {
  return JSON.parse(value, (_, currentValue) => {
    if (typeof currentValue === "string" && currentValue.startsWith(BIGINT_PREFIX)) {
      return BigInt(currentValue.slice(BIGINT_PREFIX.length));
    }
    return currentValue;
  });
}
//# sourceMappingURL=Json.js.map
