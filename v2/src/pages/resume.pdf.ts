import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const prerender = true;

export const GET: APIRoute = async () => {
  // Development and build commands run from v2; resource remains the single source.
  const pdf = await readFile(resolve('../resource/resume.pdf'));
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="resume.pdf"',
    },
  });
};
