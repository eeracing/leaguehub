import { readFile } from 'node:fs/promises';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { config } from '../../config/site';
import podiumArtwork from '../../assets/certificates/podium-titles.json';
import laurelArtwork from '../../assets/certificates/laurel-wreath.json';
import { formatDate } from './format';
import type { RaceResult, Round, SeriesConfig } from '../types';

const WIDTH = 841.89;
const HEIGHT = 595.28;
const INK = '#17233c';
const MUTED = '#637083';
const fontPath = path.join(process.cwd(), 'assets/fonts/NotoSansCJKsc-Regular.otf');
const logoCache = new Map<string, Promise<Buffer | undefined>>();

function safeLogoPath(logo: string | undefined): string | undefined {
  if (!logo?.startsWith('/') || logo.includes('..')) return undefined;
  return path.join(process.cwd(), 'public', logo.slice(1));
}

function logoImage(logo: string | undefined): Promise<Buffer | undefined> {
  const assetPath = safeLogoPath(logo);
  if (!assetPath) return Promise.resolve(undefined);
  if (!logoCache.has(assetPath)) {
    logoCache.set(assetPath, readFile(assetPath)
      .then((file) => sharp(file, { density: 300 }).resize(300, 300, { fit: 'contain' }).png().toBuffer())
      .catch(() => undefined));
  }
  return logoCache.get(assetPath)!;
}

function textWithin(doc: PDFKit.PDFDocument, value: string, x: number, y: number, maxWidth: number, size: number, minSize: number, color: string, align: 'left' | 'center' = 'left') {
  let actualSize = size;
  doc.fontSize(actualSize);
  while (doc.widthOfString(value) > maxWidth && actualSize > minSize) {
    actualSize -= 1;
    doc.fontSize(actualSize);
  }
  doc.fillColor(color).text(value, x, y, { width: maxWidth, lineBreak: false, ellipsis: true, align });
}

function centeredFittedText(doc: PDFKit.PDFDocument, value: string, y: number, width: number, maxHeight: number, size: number, minSize: number, color: string) {
  for (let actualSize = size; actualSize >= minSize; actualSize -= 1) {
    doc.fontSize(actualSize);
    if (doc.heightOfString(value, { width }) <= maxHeight) {
      doc.fillColor(color).text(value, (WIDTH - width) / 2, y, { width, align: 'center' });
      return;
    }
  }
  throw new Error(`Text is too long for a certificate: ${value}`);
}

function luminance(hex: string): number {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return 0.12;
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function readableAccent(accent: string): string {
  const channels = [1, 3, 5].map((offset) => parseInt(accent.slice(offset, offset + 2), 16));
  let color = accent;
  while (luminance(color) > 0.15) {
    for (let index = 0; index < channels.length; index += 1) channels[index] = Math.floor(channels[index] * 0.9);
    color = `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  }
  return color;
}

export async function createCertificatePdf(series: SeriesConfig, round: Round, result: RaceResult): Promise<Buffer> {
  const accent = /^#[0-9a-f]{6}$/i.test(config.site.accent) ? config.site.accent : '#1747d1';
  const accentText = readableAccent(accent);
  const seasonName = series.seasonName?.trim();
  const logo = await logoImage(series.logo) ?? await logoImage(config.site.logo);
  const font = await readFile(fontPath);
  const document = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0, compress: true, info: {
    Title: `${series.name} 第 ${round.round} 轮 · ${result.driver} · 第 ${result.position} 名`,
    Author: config.site.name,
    Subject: '正赛名次证书',
  } });
  document.font(font);
  const chunks: Buffer[] = [];
  document.on('data', (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
  });

  document.rect(0, 0, WIDTH, HEIGHT).fill('#ffffff');
  document.lineWidth(2).strokeColor(accent).rect(28, 28, WIDTH - 56, HEIGHT - 56).stroke();
  document.rect(28, 28, WIDTH - 56, 5).fill(accent);
  if (logo) document.image(logo, (WIDTH - 64) / 2, 42, { fit: [64, 64], align: 'center', valign: 'center' });
  centeredFittedText(document, seasonName ? `${series.name} · ${seasonName}` : series.name, 114, WIDTH - 140, 28, 16, 10, INK);
  document.strokeColor('#dce2eb').lineWidth(1).moveTo(128, 150).lineTo(WIDTH - 128, 150).stroke();

  document.fontSize(22).fillColor(INK).text('分站成绩证书', 70, 174, { width: WIDTH - 140, align: 'center' });
  document.fontSize(9).fillColor(MUTED).text('RACE RESULT CERTIFICATE', 70, 207, { width: WIDTH - 140, align: 'center', characterSpacing: 1.2 });
  const podiumTitle = podiumArtwork.titles[String(result.position) as keyof typeof podiumArtwork.titles];
  if (podiumTitle) {
    const color = ({ 1: '#E3B442', 2: '#B3BECE', 3: '#D99360' } as Record<number, string>)[result.position];
    const laurelScale = 0.22;
    const [, laurelTop, laurelWidth, laurelHeight] = laurelArtwork.viewBox;
    const laurelY = 244;
    for (const side of ['left', 'right'] as const) {
      const x = side === 'left' ? 83 : WIDTH - 83 - laurelWidth * laurelScale;
      document.save().translate(x, laurelY - laurelTop * laurelScale).scale(laurelScale);
      for (const outline of laurelArtwork.branches[side]) document.path(outline).fill(color);
      document.restore();
    }
    const spacing = 6;
    const titleWidth = WIDTH - 2 * (83 + laurelWidth / 2 * laurelScale + 18);
    const scale = Math.min(96 / podiumArtwork.unitsPerEm, (titleWidth - spacing * (podiumTitle.glyphs.length - 1)) / podiumTitle.width);
    const width = podiumTitle.width * scale + spacing * (podiumTitle.glyphs.length - 1);
    const x = (WIDTH - width) / 2;
    const baseline = laurelY + laurelHeight * laurelScale / 2
      + (podiumTitle.bounds.minY + podiumTitle.bounds.maxY) * scale / 2;
    // Fixed title outlines preserve the reference's DIN Condensed Bold on every build host.
    document.markContent('Span', { actual: podiumTitle.text });
    podiumTitle.glyphs.forEach((glyph, index) => {
      if (!glyph.path) return;
      document.save().translate(x + glyph.x * scale + index * spacing, baseline - glyph.y * scale)
        .scale(scale, -scale).lineWidth(1.6 / scale).lineJoin('round')
        .path(glyph.path).fillAndStroke(color, color).restore();
    });
    document.endMarkedContent();
  } else {
    centeredFittedText(document, `第 ${result.position} 名`, 218, WIDTH - 144, 145, 104, 32, accentText);
  }

  centeredFittedText(document, result.driver, 374, WIDTH - 120, 48, 31, 10, INK);
  document.strokeColor(accent).lineWidth(2).moveTo(WIDTH / 2 - 53, 434).lineTo(WIDTH / 2 + 53, 434).stroke();
  centeredFittedText(document, `在 ${round.name} 正赛中`, 448, WIDTH - 130, 30, 14, 10, INK);

  document.strokeColor('#dce2eb').lineWidth(1).moveTo(72, 484).lineTo(WIDTH - 72, 484).stroke();
  const columnWidth = (WIDTH - 144 - 36) / 3;
  const details = [
    { label: '比赛时间', value: formatDate(round.date), size: 12 },
    { label: '赛道', value: `${round.track} · ${round.layout}`, size: 11 },
    { label: '参赛车辆', value: `#${result.carNumber} · ${result.car}`, size: 11 },
  ];
  details.forEach((detail, index) => {
    const x = 72 + index * (columnWidth + 18);
    document.fontSize(9).fillColor(MUTED).text(detail.label, x, 497, { width: columnWidth, align: 'center' });
    textWithin(document, detail.value, x, 516, columnWidth, detail.size, 9, INK, 'center');
  });

  document.end();
  return finished;
}
