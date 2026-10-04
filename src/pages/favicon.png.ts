import type { APIRoute } from 'astro';
import { favicon } from '../lib/favicon';

export const GET: APIRoute = async () => {
  const { image } = await favicon;
  return new Response(image ?? null, {
    status: image ? 200 : 204,
    headers: image ? { 'Content-Type': 'image/png' } : undefined,
  });
};
