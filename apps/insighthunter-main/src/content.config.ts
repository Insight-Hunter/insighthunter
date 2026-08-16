import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    category: z.string().default('Insights'),
    hero: z.string().optional()
  })
});

const kb = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/kb' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.string().default('Knowledge Base'),
    order: z.number().default(0),
    updatedDate: z.coerce.date().optional()
  })
});

const docs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.string().default('Documentation'),
    order: z.number().default(0),
    updatedDate: z.coerce.date().optional()
  })
});

export const collections = { blog, kb, docs };
