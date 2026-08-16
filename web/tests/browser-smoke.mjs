import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const executablePath = process.env.CHROME_BIN;
if (!executablePath) throw new Error('CHROME_BIN is required for browser smoke.');

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox'],
});

try {
  const runtimeErrors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
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
  await page.close();

  const headerPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  headerPage.on('pageerror', (error) => runtimeErrors.push(error.message));
  await headerPage.addInitScript(() => {
    localStorage.setItem('rhythmcoach_product_guide_v1', 'complete');
  });
  await headerPage.goto('http://127.0.0.1:4173/#/app', { waitUntil: 'networkidle' });
  await headerPage.locator('.app-shell').waitFor({ state: 'visible' });
  const fitsViewport = await headerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (!fitsViewport) throw new Error('Mobile app surface overflows horizontally.');

  await mkdir('../visual-evidence', { recursive: true });
  await headerPage.screenshot({ path: '../visual-evidence/app-mobile-header.png', fullPage: false });

  const moreButton = headerPage.getByRole('button', { name: /^(更多|More)$/ });
  await moreButton.waitFor({ state: 'visible' });
  await moreButton.click();
  const moreMenu = headerPage.getByRole('menu', { name: /^(更多|More)$/ });
  await moreMenu.waitFor({ state: 'visible' });
  await headerPage.screenshot({ path: '../visual-evidence/app-mobile-more.png', fullPage: false });
  await moreMenu.getByRole('menuitem', { name: /^(切换到白色模式|Switch to light mode)$/ }).click();
  await headerPage.locator("html[data-theme='light']").waitFor({ state: 'attached' });

  const accountButton = headerPage.getByRole('button', { name: /^(账户|Account)$/ });
  await accountButton.click();
  const membershipDialog = headerPage.locator('.membership-dialog');
  await membershipDialog.waitFor({ state: 'visible' });
  const dialogBackground = await membershipDialog.evaluate((element) => getComputedStyle(element).backgroundColor);
  const dialogChannels = dialogBackground.match(/[\d.]+/g)?.map(Number) ?? [];
  if (dialogChannels.length < 3 || dialogChannels[0] < 220 || dialogChannels[1] < 220 || dialogChannels[2] < 220) {
    throw new Error(`Light account surface did not adopt a light background: ${dialogBackground}`);
  }

  const accountFitsViewport = await headerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (!accountFitsViewport) throw new Error('Mobile account surface overflows horizontally.');
  await headerPage.screenshot({ path: '../visual-evidence/account-light-mobile.png', fullPage: false });
  await headerPage.close();

  if (runtimeErrors.length) {
    throw new Error(`Browser runtime errors: ${runtimeErrors.join(' | ')}`);
  }
} finally {
  await browser.close();
}
