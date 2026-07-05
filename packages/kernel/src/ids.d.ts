import type { Brand } from "./brand.js";
export type EntityId<TScope extends string> = Brand<string, `${TScope}Id`>;
export type OrganizationId = EntityId<"organization">;
export type UserId = EntityId<"user">;
export type RequestId = EntityId<"request">;
export interface IdGenerator {
  create<TScope extends string>(scope: TScope): EntityId<TScope>;
}
export declare class CryptoIdGenerator implements IdGenerator {
  create<TScope extends string>(scope: TScope): EntityId<TScope>;
}
export declare function createEntityId<TScope extends string>(
  scope: TScope,
  value: string,
): EntityId<TScope>;
export declare function createOrganizationId(value: string): OrganizationId;
export declare function createUserId(value: string): UserId;
export declare function createRequestId(value: string): RequestId;
