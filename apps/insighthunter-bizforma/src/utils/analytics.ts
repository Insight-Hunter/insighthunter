import type { BizformaEnv } from "../types.js";

export function track(env: BizformaEnv, index: string, ...blobs: string[]): void {
  env.ANALYTICS.writeDataPoint({
    blobs,
    indexes: [index]
  });
}
