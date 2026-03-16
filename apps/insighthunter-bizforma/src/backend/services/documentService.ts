import type { Env } from '../types';

export const documentService = {
  async upload(env: Env, userId: string, file: File): Promise<string> {
    const key = `${userId}/${Date.now()}-${file.name}`;
    await env.R2_DOCS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    return key;
  },

  async get(env: Env, userId: string, key: string) {
    if (!key.startsWith(`${userId}/`)) {
      return null;
    }
    return env.R2_DOCS.get(key);
  },
};
