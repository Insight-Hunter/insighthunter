import type { Env } from '../types/env';

export async function putHtmlDocument(env: Env, storageKey: string, html: string) {
  await env.DOCUMENTS.put(storageKey, html, { httpMetadata: { contentType: 'text/html' } });
  return storageKey;
}

export async function signedDocumentUrl(env: Env, storageKey: string) {
  const object = await env.DOCUMENTS.head(storageKey);
  if (!object) return null;
  return `/api/documents/signed-url?key=${encodeURIComponent(storageKey)}`;
}

export function buildOperatingAgreement(companyName: string, state: string) {
  return `<!doctype html><html><body><h1>Operating Agreement</h1><p>${companyName}</p><p>${state}</p></body></html>`;
}
