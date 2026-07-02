import { type EntityId, createEntityId } from "./ids.js";

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

export function createRequestContext(
  input: CreateRequestContextInput = {},
): RequestContext {
  const headerValue = (name: string): string | null =>
    input.request?.headers.get(name) ?? null;
  const requestId =
    input.requestId ?? headerValue("x-request-id") ?? crypto.randomUUID();
  const traceId =
    input.traceId ??
    headerValue("cf-ray") ??
    headerValue("traceparent") ??
    undefined;
  const organizationId =
    input.organizationId ?? headerValue("x-organization-id") ?? undefined;
  const actorId = input.actorId ?? headerValue("x-user-id") ?? undefined;
  const cf = getCloudflareRequestMetadata(input.request);
  const context: RequestContext = {
    requestId: createEntityId("request", requestId),
  };

  if (organizationId !== undefined) {
    returnWith(
      context,
      "organizationId",
      createEntityId("organization", organizationId),
    );
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

function returnWith<TKey extends keyof RequestContext>(
  context: RequestContext,
  key: TKey,
  value: RequestContext[TKey],
): void {
  Object.assign(context, { [key]: value });
}

function getCloudflareRequestMetadata(
  request: Request | undefined,
): Readonly<Record<string, unknown>> | undefined {
  if (request === undefined || !("cf" in request)) {
    return undefined;
  }

  return request.cf as Readonly<Record<string, unknown>>;
}
