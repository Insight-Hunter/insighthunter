import { type Brand, brandValue } from "./brand.js";

export type EntityId<TScope extends string> = Brand<string, `${TScope}Id`>;
export type OrganizationId = EntityId<"organization">;
export type UserId = EntityId<"user">;
export type RequestId = EntityId<"request">;

export interface IdGenerator {
  create<TScope extends string>(scope: TScope): EntityId<TScope>;
}

export class CryptoIdGenerator implements IdGenerator {
  create<TScope extends string>(scope: TScope): EntityId<TScope> {
    return createEntityId(scope, crypto.randomUUID());
  }
}

export function createEntityId<TScope extends string>(
  scope: TScope,
  value: string,
): EntityId<TScope> {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error(`${scope} id cannot be empty`);
  }

  return brandValue<string, `${TScope}Id`>(trimmed);
}

export function createOrganizationId(value: string): OrganizationId {
  return createEntityId("organization", value);
}

export function createUserId(value: string): UserId {
  return createEntityId("user", value);
}

export function createRequestId(value: string): RequestId {
  return createEntityId("request", value);
}
