/// <reference types="astro/client" />

import type { Env } from "./index.js";

declare global {
  namespace App {
    interface Locals {
      runtime: {
        env: Env;
        ctx: ExecutionContext;
      };
    };
  }
}
