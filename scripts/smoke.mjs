import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const root = process.cwd();
const port = 4173;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8'
};

const server = http.createServer(async (req, res) => {
  try {
    const requestPath = req.url === '/' ? '/index.html' : req.url;
    const cleanPath = decodeURIComponent(requestPath).split('?')[0];
    const safePath = path.posix.normalize(cleanPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.resolve(root, `.${safePath}`);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'content-type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});

await new Promise((resolve) => server.listen(port, resolve));

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(750);

  const outputDir = path.join(root, 'artifacts');
  await fs.mkdir(outputDir, { recursive: true });
  await page.screenshot({ path: path.join(outputDir, 'smoke-light-regular.png'), fullPage: true });

  await page.selectOption('#theme', 'dark');
  await page.selectOption('#style', 'subdued');
  await page.click('#reduceTransparency');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outputDir, 'smoke-dark-subdued-reduced.png'), fullPage: true });
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

console.log('Smoke verification screenshots captured in artifacts/.');
