import type { EntityId } from "./ids.js";
export interface DomainEvent<TPayload = unknown, TType extends string = string> {
    readonly id: EntityId<"event">;
    readonly type: TType;
    readonly aggregateId: string;
    readonly organizationId: string;
    readonly occurredAt: string;
    readonly payload: Readonly<TPayload>;
    readonly metadata: Readonly<Record<string, unknown>>;
}
export interface CreateDomainEventInput<TPayload, TType extends string> {
    readonly id?: EntityId<"event">;
    readonly type: TType;
    readonly aggregateId: string;
    readonly organizationId: string;
    readonly occurredAt: string;
    readonly payload: TPayload;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
export declare function createDomainEvent<TPayload, TType extends string>(input: CreateDomainEventInput<TPayload, TType>): DomainEvent<TPayload, TType>;
