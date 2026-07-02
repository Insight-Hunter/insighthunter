import { SystemClock } from "./clock.js";
import { createRequestContext } from "./context.js";
import { CryptoIdGenerator } from "./ids.js";
export function createKernelRuntime(input) {
    const runtime = {
        env: input.env,
        requestContext: input.requestContext ?? createContextFromRequest(input.request),
        clock: input.clock ?? new SystemClock(),
        ids: input.ids ?? new CryptoIdGenerator(),
        waitUntil(promise) {
            input.ctx?.waitUntil(promise);
        },
    };
    if (input.ctx !== undefined) {
        Object.assign(runtime, { ctx: input.ctx });
    }
    return runtime;
}
function createContextFromRequest(request) {
    if (request === undefined) {
        return createRequestContext();
    }
    return createRequestContext({ request });
}
//# sourceMappingURL=cloudflare.js.map