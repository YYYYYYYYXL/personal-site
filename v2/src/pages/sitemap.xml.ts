import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { profile } from '../data/profile';

export const GET: APIRoute = async () => {
  const projects = await getCollection('projects');
  const routes = ['/', '/projects/', '/about/', '/contact/', ...projects.map(project => `/projects/${project.id}/`)];
  const urls = routes.map(route => `<url><loc>${new URL(route, profile.site).href}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
