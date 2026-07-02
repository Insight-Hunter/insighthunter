import { createEntityId } from "./ids.js";
export function createRequestContext(input = {}) {
    const headerValue = (name) => input.request?.headers.get(name) ?? null;
    const requestId = input.requestId ?? headerValue("x-request-id") ?? crypto.randomUUID();
    const traceId = input.traceId ??
        headerValue("cf-ray") ??
        headerValue("traceparent") ??
        undefined;
    const organizationId = input.organizationId ?? headerValue("x-organization-id") ?? undefined;
    const actorId = input.actorId ?? headerValue("x-user-id") ?? undefined;
    const cf = getCloudflareRequestMetadata(input.request);
    const context = {
        requestId: createEntityId("request", requestId),
    };
    if (organizationId !== undefined) {
        returnWith(context, "organizationId", createEntityId("organization", organizationId));
    }
    if (actorId !== undefined) {
        returnWith(context, "actorId", createEntityId("user", actorId));
    }
    if (traceId !== undefined) {
        returnWith(context, "traceId", traceId);
    }
    if (cf !== undefined) {
        returnWith(context, "cf", cf);
    }
    return context;
}
function returnWith(context, key, value) {
    Object.assign(context, { [key]: value });
}
function getCloudflareRequestMetadata(request) {
    if (request === undefined || !("cf" in request)) {
        return undefined;
    }
    return request.cf;
}
//# sourceMappingURL=context.js.map