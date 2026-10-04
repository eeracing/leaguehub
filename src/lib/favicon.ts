import path from 'node:path';
import sharp from 'sharp';
import { config } from '../../config/site';

interface Favicon {
  href: string;
  type?: string;
  sizes?: string;
  image?: Uint8Array<ArrayBuffer>;
}

async function createFavicon(): Promise<Favicon> {
  const logo = config.site.logo;
  const fallback = { href: logo };
  if (!logo.startsWith('/') || logo.startsWith('//') || logo.includes('..')) return fallback;

  try {
    const pathname = new URL(logo, 'https://localhost').pathname;
    const assetPath = path.join(process.cwd(), 'public', decodeURIComponent(pathname).slice(1));
    const publicPath = path.join(process.cwd(), 'public') + path.sep;
    if (!assetPath.startsWith(publicPath)) return fallback;

    const image = await sharp(assetPath)
      .rotate()
      .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    return {
      href: '/favicon.png',
      type: 'image/png',
      sizes: '64x64',
      image: new Uint8Array(image),
    };
  } catch {
    // Preserve the logo link when a local image cannot be converted.
    return fallback;
  }
}

// Generate the shared icon once for the endpoint and all pages during the build.
export const favicon = createFavicon();
