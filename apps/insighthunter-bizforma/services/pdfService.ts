import type { Env } from '../types/env';

export async function generateHtmlPdf(env: Env, html: string): Promise<ArrayBuffer> {
  const browser = await env.BROWSER.launch({});
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '24px', right: '24px', bottom: '24px', left: '24px' },
    });
    await page.close();
    return pdf;
  } finally {
    await browser.close();
  }
}
