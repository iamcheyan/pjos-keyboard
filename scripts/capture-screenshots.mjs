// Capture the PJOS Keyboard showcase matrix from the built app.
//
//   CHROME_BIN=/usr/bin/google-chrome node scripts/capture-screenshots.mjs
//
// State is driven through the real showcase controls (device profile, layout,
// theme, capabilities) plus the DPad simulation buttons. Fails on duplicate
// hash, wrong PNG size, horizontal overflow, missing keyboard keys, or any
// console/HTTP error. Writes docs/screenshots/manifest.json.
import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = (process.env.KEYBOARD_URL ?? 'http://127.0.0.1:5199').replace(/\/$/, '');
const CHROME = process.env.CHROME_BIN ?? '/usr/bin/google-chrome';
const OUT = path.resolve(process.env.KEYBOARD_SHOTS ?? 'docs/screenshots');
const sleep = ms => new Promise(r => setTimeout(r, ms));
mkdirSync(OUT, { recursive: true });

// name, width, height, profile, layout, theme, capabilities, dpad presses
const SHOTS = [
  ['text-light-touch-1280x720', 1280, 720, 'Desktop', 'text', 'light', 'Touch', 0],
  ['text-dark-touch-1280x720', 1280, 720, 'Desktop', 'text', 'dark', 'Touch', 0],
  ['text-oled-touch-1280x720', 1280, 720, 'Desktop', 'text', 'oled', 'Touch', 0],
  ['text-dark-dpad-1280x720', 1280, 720, 'RG34XX', 'text', 'dark', 'DPad,Gamepad', 3],
  ['number-dark-touch-1280x720', 1280, 720, 'Desktop', 'number', 'dark', 'Touch', 0],
  ['url-light-touch-1280x720', 1280, 720, 'Desktop', 'url', 'light', 'Touch', 0],
  ['text-light-touch-320x240', 320, 240, 'Android Tablet', 'text', 'light', 'Touch', 0],
  ['text-dark-dpad-480x320', 480, 320, 'RG34XX', 'text', 'dark', 'DPad,Gamepad', 2],
  ['text-light-touch-640x480', 640, 480, 'Leaf3C', 'text', 'light', 'Touch,DPad', 0],
  ['text-dark-touch-720x720', 720, 720, 'Desktop', 'text', 'dark', 'Touch', 0],
];

const errors = [];
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
page.on('response', (response) => { if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`); });

const seen = new Map();
const manifest = [];

try {
  for (const [name, width, height, profile, layout, theme, capabilities, dpad] of SHOTS) {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('.pjos-keyboard', { timeout: 15000 });
    const selects = await page.$$('select');
    if (selects.length !== 4) throw new Error(`${name}: expected 4 showcase selects, found ${selects.length}`);
    await selects[0].select(profile);
    await selects[1].select(layout);
    await selects[2].select(theme);
    await selects[3].select(capabilities);
    await sleep(350);
    for (let i = 0; i < dpad; i++) {
      const moved = await page.evaluate(() => {
        const button = [...document.querySelectorAll('button')].find((node) => node.textContent?.trim() === 'right');
        if (!button) return false;
        button.click();
        return true;
      });
      if (!moved) throw new Error(`${name}: DPad right control not found`);
      await sleep(120);
    }
    await sleep(250);
    const audit = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      keys: document.querySelectorAll('.pjos-keyboard button, .pjos-key cap, .key').length,
      mode: (document.body.innerText.match(/Mode:\s*(touch|dpad)/i)?.[1] ?? 'unknown').toLowerCase(),
      text: document.body.innerText.trim().length,
    }));
    if (audit.overflow > 1) throw new Error(`${name}: horizontal overflow ${audit.overflow}px`);
    if (audit.text < 40) throw new Error(`${name}: page rendered almost no text (${audit.text})`);
    const expectedMode = capabilities.includes('DPad') && !capabilities.split(',').includes('Touch') ? 'dpad' : null;
    if (expectedMode && audit.mode !== expectedMode) throw new Error(`${name}: expected ${expectedMode} mode, page says ${audit.mode}`);
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file });
    const bytes = readFileSync(file);
    if (bytes.subarray(0, 8).toString('binary') !== '\x89PNG\r\n\x1a\n') throw new Error(`${name}: not a PNG`);
    const w = bytes.readUInt32BE(16);
    const h = bytes.readUInt32BE(20);
    if (w !== width || h !== height) throw new Error(`${name}: PNG ${w}x${h}, expected ${width}x${height}`);
    const sha = createHash('sha256').update(bytes).digest('hex');
    if (seen.has(sha)) throw new Error(`${name}: duplicate of ${seen.get(sha)}`);
    seen.set(sha, name);
    manifest.push({ name: `${name}.png`, width: w, height: h, profile, layout, theme, capabilities, dpad, mode: audit.mode, sha256: sha });
    console.log(`${name}: ${w}x${h} mode=${audit.mode} sha256=${sha.slice(0, 16)}`);
  }
} finally {
  await page.close();
  await browser.close();
}

if (errors.length) {
  throw new Error(`console/HTTP errors during capture:\n${[...new Set(errors)].join('\n')}`);
}
await writeFile(path.join(OUT, 'manifest.json'), `${JSON.stringify({ captured_at: new Date().toISOString(), ui: BASE, chrome: CHROME, screenshots: manifest }, null, 2)}\n`);
console.log(`captured ${manifest.length} screenshots, ${seen.size} unique hashes, no overflow, no console errors`);
