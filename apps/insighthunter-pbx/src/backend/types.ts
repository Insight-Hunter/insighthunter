
export interface Env {
    // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
    // MY_KV_NAMESPACE: KVNamespace;
    //
    // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
    // MY_DURABLE_OBJECT: DurableObjectNamespace;
    //
    // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
    // MY_BUCKET: R2Bucket;

    PBX_ASSETS: R2Bucket;

    PBX_ROOM: DurableObjectNamespace;
    CALL_SESSION: DurableObjectNamespace;

    TWILIO_ACCOUNT_SID: string;
    TWILIO_AUTH_TOKEN: string;
    TWILIO_PHONE_NUMBER: string;

    SENTRY_DSN: string;
}

export type CF = {
    cf: {
        // https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties
    };
};
