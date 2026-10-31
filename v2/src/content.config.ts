import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    shortTitle: z.string(),
    summary: z.string(),
    category: z.enum(['research', 'opensource', 'personal', 'data']),
    categoryLabel: z.string(),
    status: z.enum(['in-progress', 'practice', 'local-preview']),
    statusLabel: z.string(),
    role: z.string(),
    period: z.string(),
    tags: z.array(z.string()),
    order: z.number(),
    featured: z.boolean().default(false),
    icon: z.string(),
    cover: z.enum(['research', 'studio', 'none']).default('none'),
    links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
    updated: z.string(),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/notes' }),
  schema: z.object({ title: z.string(), description: z.string(), kind: z.enum(['intro', 'note']).default('note'), order: z.number(), icon: z.string(), tags: z.array(z.string()), sources: z.array(z.string()) }),
});

export const collections = { projects, notes };
