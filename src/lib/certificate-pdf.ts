import { readFile } from 'node:fs/promises';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { config } from '../../config/site';
import { formatDate } from './format';
import type { RaceResult, Round, SeriesConfig } from '../types';

const WIDTH = 792;
const HEIGHT = 612;
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
  const document = new PDFDocument({ size: [WIDTH, HEIGHT], margin: 0, compress: true, info: {
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
  document.lineWidth(2).strokeColor(accent).rect(27, 27, 738, 558).stroke();
  document.rect(27, 27, 738, 5).fill(accent);
  if (logo) document.image(logo, 362, 46, { fit: [68, 68], align: 'center', valign: 'center' });
  centeredFittedText(document, seasonName ? `${series.name} · ${seasonName}` : series.name, 122, 650, 27, 15, 10, INK);
  document.strokeColor('#dce2eb').lineWidth(1).moveTo(125, 159).lineTo(667, 159).stroke();

  document.fontSize(22).fillColor(INK).text('分站成绩证书', 70, 185, { width: 652, align: 'center' });
  document.fontSize(9).fillColor(MUTED).text('RACE RESULT CERTIFICATE', 70, 216, { width: 652, align: 'center', characterSpacing: 1.2 });
  document.fontSize(108).fillColor(accentText).text(`第 ${result.position} 名`, 76, 229, { width: 652, align: 'center' });

  centeredFittedText(document, result.driver, 386, 660, 48, 31, 10, INK);
  document.strokeColor(accent).lineWidth(2).moveTo(343, 446).lineTo(449, 446).stroke();
  centeredFittedText(document, `在 ${round.name} 正赛中`, 460, 670, 36, 14, 10, INK);

  document.strokeColor('#dce2eb').lineWidth(1).moveTo(72, 500).lineTo(720, 500).stroke();
  document.fontSize(9).fillColor(MUTED).text('比赛时间', 70, 513, { width: 205, align: 'center' });
  document.fontSize(9).fillColor(MUTED).text('赛道', 294, 513, { width: 205, align: 'center' });
  document.fontSize(9).fillColor(MUTED).text('参赛车辆', 518, 513, { width: 205, align: 'center' });
  textWithin(document, formatDate(round.date), 70, 531, 205, 12, 9, INK, 'center');
  textWithin(document, `${round.track} · ${round.layout}`, 294, 531, 205, 11, 9, INK, 'center');
  textWithin(document, `#${result.carNumber} · ${result.car}`, 518, 531, 205, 11, 9, INK, 'center');

  document.end();
  return finished;
}
