import { chromium } from '@playwright/test';

const executablePath = process.env.CHROME_BIN;
if (!executablePath) throw new Error('CHROME_BIN is required for browser smoke.');

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('rhythmcoach_product_guide_v1', 'complete');
  });

  await page.goto('http://127.0.0.1:4173/#/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^(Open app|打开应用)$/ }).first().click();
  await page.locator('.app-shell').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /^(Start rehearsal|开始训练)$/ }).last().click();
  await page.locator('.prompter-shell').waitFor({ state: 'visible' });

  await page.goto('http://127.0.0.1:4173/#/app?sync=A3F82C', { waitUntil: 'networkidle' });
  await page.locator('.prompter-shell').waitFor({ state: 'visible' });
  const invitePanel = page.locator('.podcast-sync-panel.is-invite');
  await invitePanel.waitFor({ state: 'visible' });
  await invitePanel.getByText(/^(同步播客邀请|Podcast sync invite)$/).first().waitFor({ state: 'visible' });
  const inviteCode = await invitePanel.locator('.podcast-sync-invite-code strong').textContent();
  if (inviteCode?.trim() !== 'A3F82C') throw new Error(`Podcast invite room ID mismatch: ${inviteCode}`);

  await page.setViewportSize({ width: 390, height: 844 });
  const inviteFitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (!inviteFitsViewport) throw new Error('Mobile podcast invite surface overflows horizontally.');

  await page.goto('http://127.0.0.1:4173/#/app', { waitUntil: 'networkidle' });
  const fitsViewport = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (!fitsViewport) throw new Error('Mobile app surface overflows horizontally.');

  if (runtimeErrors.length) {
    throw new Error(`Browser runtime errors: ${runtimeErrors.join(' | ')}`);
  }
} finally {
  await browser.close();
}
