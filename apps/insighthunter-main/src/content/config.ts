import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
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
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.string().default('Knowledge Base'),
    order: z.number().default(0),
    updatedDate: z.coerce.date().optional()
  })
});

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.string().default('Documentation'),
    order: z.number().default(0),
    updatedDate: z.coerce.date().optional()
  })
});

export const collections = { blog, kb, docs };
