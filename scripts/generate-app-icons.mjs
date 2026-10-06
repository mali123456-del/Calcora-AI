import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(projectRoot, 'electron', 'assets', 'calcora-icon.svg');
const outputDirectory = path.join(projectRoot, 'build', 'icons');
const pngSizes = [16, 24, 32, 48, 64, 96, 128, 256, 512, 1024];
const sourceImage = await loadImage(await readFile(svgPath));

await mkdir(outputDirectory, { recursive: true });

async function renderPng(size) {
  const canvas = createCanvas(size, size);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(sourceImage, 0, 0, size, size);
  return canvas.toBuffer('image/png');
}

const renderedImages = new Map();
for (const size of pngSizes) {
  const png = await renderPng(size);
  renderedImages.set(size, png);
  await writeFile(path.join(outputDirectory, `${size}x${size}.png`), png);
}

// Keep a standalone PNG for BrowserWindow and asar extraResources.
await writeFile(path.join(outputDirectory, 'calcora-icon.png'), renderedImages.get(256));

function createIco(entries) {
  const directoryLength = 6 + entries.length * 16;
  const header = Buffer.alloc(directoryLength);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);

  let dataOffset = directoryLength;
  const imageBuffers = [];
  entries.forEach(({ size, data }, index) => {
    const offset = 6 + index * 16;
    header.writeUInt8(size === 256 ? 0 : size, offset);
    header.writeUInt8(size === 256 ? 0 : size, offset + 1);
    header.writeUInt8(0, offset + 2);
    header.writeUInt8(0, offset + 3);
    header.writeUInt16LE(1, offset + 4);
    header.writeUInt16LE(32, offset + 6);
    header.writeUInt32LE(data.length, offset + 8);
    header.writeUInt32LE(dataOffset, offset + 12);
    dataOffset += data.length;
    imageBuffers.push(data);
  });

  return Buffer.concat([header, ...imageBuffers]);
}

const windowsSizes = [16, 24, 32, 48, 64, 128, 256];
const windowsIcon = createIco(windowsSizes.map((size) => ({ size, data: renderedImages.get(size) })));
await writeFile(path.join(outputDirectory, 'calcora-icon.ico'), windowsIcon);

function createIcns(entries) {
  const chunks = entries.map(({ type, data }) => {
    const chunk = Buffer.alloc(8);
    chunk.write(type, 0, 4, 'ascii');
    chunk.writeUInt32BE(data.length + 8, 4);
    return Buffer.concat([chunk, data]);
  });
  const payloadLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(payloadLength + header.length, 4);
  return Buffer.concat([header, ...chunks]);
}

const macIconTypes = [
  [16, 'icp4'],
  [32, 'icp5'],
  [64, 'icp6'],
  [128, 'ic07'],
  [256, 'ic08'],
  [512, 'ic09'],
  [1024, 'ic10'],
];
const macIcon = createIcns(macIconTypes.map(([size, type]) => ({ size, type, data: renderedImages.get(size) })));
await writeFile(path.join(outputDirectory, 'calcora-icon.icns'), macIcon);

console.log(`Generated Calcora icons in ${path.relative(projectRoot, outputDirectory)} (ICO, ICNS, ${pngSizes.length} PNG sizes).`);
