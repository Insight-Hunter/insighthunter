import { type EntityId } from "./ids.js";
export interface RequestContext {
    readonly requestId: EntityId<"request">;
    readonly organizationId?: EntityId<"organization">;
    readonly actorId?: EntityId<"user">;
    readonly traceId?: string;
    readonly cf?: Readonly<Record<string, unknown>>;
}
export interface CreateRequestContextInput {
    readonly request?: Request;
    readonly requestId?: string;
    readonly organizationId?: string;
    readonly actorId?: string;
    readonly traceId?: string;
}
export declare function createRequestContext(input?: CreateRequestContextInput): RequestContext;
