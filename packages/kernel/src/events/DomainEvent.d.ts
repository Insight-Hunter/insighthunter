export interface DomainEvent<TPayload extends object = Record<string, never>> {
    readonly eventName: string;
    readonly aggregateId: string;
    readonly occurredAt: Date;
    readonly payload: Readonly<TPayload>;
}
