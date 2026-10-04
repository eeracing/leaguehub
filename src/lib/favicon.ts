import path from 'node:path';
import sharp from 'sharp';
import { config } from '../../config/site';

async function readFaviconAttributes(): Promise<{ type?: string; sizes?: string }> {
  const logo = config.site.logo;
  if (!logo.startsWith('/') || logo.startsWith('//') || logo.includes('..')) return {};

  const pathname = new URL(logo, 'https://localhost').pathname;
  const assetPath = path.join(process.cwd(), 'public', decodeURIComponent(pathname).slice(1));
  const publicPath = path.join(process.cwd(), 'public') + path.sep;
  if (!assetPath.startsWith(publicPath)) return {};

  try {
    const metadata = await sharp(assetPath).metadata();
    return {
      type: metadata.mediaType,
      sizes: metadata.format === 'svg'
        ? 'any'
        : metadata.width && metadata.height ? `${metadata.width}x${metadata.height}` : undefined,
    };
  } catch {
    // Preserve the existing icon link for formats Sharp cannot inspect or external assets.
    return {};
  }
}

// Inspect the shared logo once per build, rather than once for every page.
export const faviconAttributes = readFaviconAttributes();
