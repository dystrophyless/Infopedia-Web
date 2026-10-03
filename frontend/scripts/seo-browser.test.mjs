import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const proofDir = process.env.SEO_PROOF_DIR;
if (proofDir) await mkdir(proofDir, { recursive: true });
const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
const { seo: ru } = JSON.parse(await readFile(path.join(root, 'src/locales/ru/translation.json'), 'utf8'));
const { seo: kk } = JSON.parse(await readFile(path.join(root, 'src/locales/kk/translation.json'), 'utf8'));
const matches = (pattern, pathname) => new RegExp(`^${pattern.replace(/:[a-zA-Z]+/g, '[^/]+')}$`).test(pathname);
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const rewrite = config.rewrites.find((entry) => matches(entry.source, pathname));
    const filename = pathname === '/' ? '/index.html' : rewrite?.destination ?? pathname;
    const target = path.resolve(dist, '.' + filename);
    assert.ok(target.startsWith(dist + path.sep));
    const content = await readFile(target);
    response.setHeader('Content-Type', mime[path.extname(target)] ?? 'application/octet-stream');
    for (const entry of config.headers.filter((entry) => matches(entry.source, pathname))) {
      for (const header of entry.headers) response.setHeader(header.key, header.value);
    }
    response.end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport });
    const page = await context.newPage();
    await page.goto(origin);
    assert.equal(await page.title(), ru.homeTitle);
    assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), ru.homeDescription);
    assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
    assert.equal(await page.locator('h1:visible').count(), 1, 'Responsive landing must be readable without JS');
    assert.ok(await page.locator('a[href="/onboarding"]:visible').count());
    const broken = await page.locator('img:visible').evaluateAll((images) => images.filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src));
    assert.deepEqual(broken, [], 'Prerender images must load from built assets');
    if (proofDir) await page.screenshot({ path: path.join(proofDir, `seo-no-js-${viewport.width}.png`) });
    const login = await page.goto(`${origin}/login`);
    assert.equal(login.headers()['x-robots-tag'], 'noindex, nofollow');
    assert.equal(await page.locator('link[rel="canonical"]').count(), 0);
    assert.equal(await page.locator('#root').innerHTML(), '');
    await context.close();
  }
  const iconResponse = await fetch(`${origin}/favicon.png`);
  assert.equal(iconResponse.status, 200);
  assert.match(iconResponse.headers.get('content-type'), /image\/png/);
  assert.equal((await fetch(`${origin}/favicon.ico`)).status, 200);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  // Do not call production APIs while checking the build.
  await context.route('**/*', (route) => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(origin);
  await page.locator('meta[data-seo-owned="robots"]').waitFor({ state: 'attached' });
  assert.equal(await page.title(), ru.homeTitle);
  assert.equal(await page.locator('meta[name="description"]').count(), 1);
  assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 1);
  if (proofDir) await page.screenshot({ path: path.join(proofDir, 'seo-with-js-1440.png') });
  await page.locator('a[href="/login"]:visible').click();
  await page.waitForURL(`${origin}/login`);
  await page.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content === 'noindex, nofollow');
  assert.equal(await page.locator('link[rel="canonical"]').count(), 0);
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0);
  assert.equal(await page.locator('meta[property="og:url"]').count(), 0);
  await page.goto(`${origin}/unknown-seo-page`);
  assert.equal((await page.request.get(`${origin}/unknown-seo-page`)).status(), 404);
  await context.addInitScript(() => localStorage.setItem('infopedia_lang', JSON.stringify({ state: { lang: 'kk' }, version: 0 })));
  await page.goto(origin);
  await page.waitForFunction((title) => document.title === title, kk.homeTitle);
  assert.equal(await page.locator('html').getAttribute('lang'), 'kk');
  assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), kk.homeDescription);
  assert.equal(await page.locator('link[rel="canonical"]').count(), 1);
  assert.deepEqual(errors, [], 'Prerender replacement and route transitions must not raise runtime errors');
  await context.close();
  console.log('SEO browser checks passed: no-JS desktop/mobile, assets, RU/KK metadata, route cleanup, private noindex, real 404.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
