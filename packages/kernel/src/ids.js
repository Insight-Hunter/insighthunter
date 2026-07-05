import { brandValue } from "./brand.js";
export class CryptoIdGenerator {
  create(scope) {
    return createEntityId(scope, crypto.randomUUID());
  }
}
export function createEntityId(scope, value) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`${scope} id cannot be empty`);
  }
  return brandValue(trimmed);
}
export function createOrganizationId(value) {
  return createEntityId("organization", value);
}
export function createUserId(value) {
  return createEntityId("user", value);
}
export function createRequestId(value) {
  return createEntityId("request", value);
}
//# sourceMappingURL=ids.js.map
