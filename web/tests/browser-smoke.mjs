import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const executablePath = process.env.CHROME_BIN;
if (!executablePath) throw new Error('CHROME_BIN is required for browser smoke.');

const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox'] });
const runtimeErrors = [];
const SUPABASE_URL = 'https://blgwlycfcwvsupmqyqwn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_n1Va-c_alpkQ0zNuJYUaxA_J0u68RVW';

async function preparePage(page, theme = 'dark') {
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.addInitScript((selectedTheme) => {
    localStorage.setItem('rhythmcoach_product_guide_v1', 'complete');
    localStorage.setItem('rhythmcoach_theme_v1', selectedTheme);
  }, theme);
}

async function prepareRoomMock(page, { userId = 'host-1', signedIn = true } = {}) {
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0', (route) => route.abort());
  await page.addInitScript(({ activeUserId, hasPermanentSession }) => {
    const room = {
      id: 'room-1', room_code: 'A3F82C', host_user_id: 'host-1',
      title: 'Shared podcast rehearsal',
      script: 'Opening\nA shared script for room UI quality verification.\nClosing',
      delivery_markup: null,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
    const memberData = [
      { room_id: room.id, user_id: 'host-1', display_name: 'Host', avatar_url: null, can_scroll: true, joined_at: '2026-08-16T10:00:00Z', last_seen_at: '2026-08-16T10:40:00Z' },
      { room_id: room.id, user_id: 'member-2', display_name: 'Alex', avatar_url: null, can_scroll: true, joined_at: '2026-08-16T10:01:00Z', last_seen_at: '2026-08-16T10:40:00Z' },
      { room_id: room.id, user_id: 'member-3', display_name: 'Guest 3A7F', avatar_url: null, can_scroll: false, joined_at: '2026-08-16T10:02:00Z', last_seen_at: '2026-08-16T10:40:00Z' },
      { room_id: room.id, user_id: 'member-4', display_name: 'Kai', avatar_url: null, can_scroll: false, joined_at: '2026-08-16T10:03:00Z', last_seen_at: '2026-08-16T10:40:00Z' }
    ];
    const permanentUser = {
      id: activeUserId, email: `${activeUserId}@example.com`, is_anonymous: false,
      user_metadata: { full_name: memberData.find((member) => member.user_id === activeUserId)?.display_name ?? 'Member' }
    };
    const anonymousUser = {
      id: activeUserId, email: null, is_anonymous: true,
      user_metadata: { full_name: memberData.find((member) => member.user_id === activeUserId)?.display_name ?? 'Guest 3A7F' }
    };
    const profile = { id: activeUserId, display_name: permanentUser.user_metadata.full_name, avatar_url: null, locale: 'zh', last_seen_at: new Date().toISOString() };
    const productAccount = { user_id: activeUserId, product_code: 'rhythmcoach', preferences: {}, state: {}, first_seen_at: new Date().toISOString(), last_seen_at: new Date().toISOString() };
    let currentSession = hasPermanentSession ? { user: permanentUser, access_token: 'test-token' } : null;
    const authListeners = [];

    const rows = (table, single) => {
      if (table === 'profiles') return single ? profile : [profile];
      if (table === 'product_accounts') return single ? productAccount : [productAccount];
      if (table === 'entitlements' || table === 'subscriptions') return single ? null : [];
      if (table === 'rhythmcoach_sync_rooms') return single ? room : [room];
      if (table === 'rhythmcoach_sync_members') return single ? memberData[0] : memberData.map((member) => ({ ...member }));
      return single ? null : [];
    };
    const builderFor = (table) => {
      const builder = {
        select: () => builder, insert: () => builder, update: () => builder, upsert: () => builder,
        eq: () => builder, order: () => builder,
        maybeSingle: async () => ({ data: rows(table, true), error: null }),
        single: async () => ({ data: rows(table, true), error: null }),
        then: (resolve, reject) => Promise.resolve({ data: rows(table, false), error: null }).then(resolve, reject)
      };
      return builder;
    };
    const channelFor = () => {
      const callbacks = [];
      const channel = {
        on(type, filter, callback) { callbacks.push({ type, event: filter.event, callback }); return channel; },
        subscribe(callback) { window.setTimeout(() => callback?.('SUBSCRIBED'), 0); return channel; },
        send: async () => 'ok',
        track: async () => {
          window.setTimeout(() => callbacks.filter((entry) => entry.type === 'presence' && entry.event === 'sync').forEach((entry) => entry.callback({})), 0);
          return 'ok';
        },
        presenceState: () => ({ room: memberData.map((member) => ({ user_id: member.user_id })) })
      };
      return channel;
    };
    const client = {
      auth: {
        getSession: async () => ({ data: { session: currentSession }, error: null }),
        onAuthStateChange: (callback) => { authListeners.push(callback); return { data: { subscription: { unsubscribe() {} } } }; },
        signInAnonymously: async () => {
          currentSession = { user: anonymousUser, access_token: 'guest-token' };
          authListeners.forEach((callback) => callback('SIGNED_IN', currentSession));
          return { data: { user: anonymousUser, session: currentSession }, error: null };
        },
        signInWithOAuth: async () => ({ error: null }), signInWithOtp: async () => ({ error: null }), signOut: async () => ({ error: null })
      },
      from: (table) => builderFor(table),
      rpc: async (fn, params = {}) => {
        if (fn === 'rhythmcoach_join_sync_room' || fn === 'rhythmcoach_create_sync_room') return { data: { room_id: room.id, room_code: room.room_code }, error: null };
        if (fn === 'rhythmcoach_set_sync_scroll_permission') {
          const member = memberData.find((item) => item.user_id === params.p_member_user_id);
          if (member) member.can_scroll = Boolean(params.p_can_scroll);
        }
        return { data: null, error: null };
      },
      channel: () => channelFor(), removeChannel: async () => 'ok'
    };
    window.supabase = { createClient: () => client };
  }, { activeUserId: userId, hasPermanentSession: signedIn });
}

function overlaps(a, b) {
  if (!a || !b) return false;
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
}

async function assertPrompterToolsDoNotOverlap(page, label) {
  const trigger = await page.locator('.podcast-sync-trigger').boundingBox();
  const displayControls = await page.locator('.prompter-display-controls').boundingBox();
  const topActions = await page.locator('.top-actions').boundingBox();
  if (overlaps(trigger, displayControls)) throw new Error(`${label}: room trigger overlaps display controls.`);
  if (overlaps(trigger, topActions)) throw new Error(`${label}: room trigger overlaps mirror/exit controls.`);
  if (overlaps(displayControls, topActions)) throw new Error(`${label}: display controls overlap mirror/exit controls.`);
}

async function assertFitsViewport(page, label) {
  if (!await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)) throw new Error(`${label}: surface overflows horizontally.`);
}

async function assertSharedScript(page) {
  await page.locator('.prompter-text').waitFor({ state: 'attached' });
  const text = await page.locator('.prompter-text').textContent();
  if (!text?.includes('A shared script for room UI quality verification.')) throw new Error(`Shared room script was not loaded: ${text}`);
}

async function choosePodcastMode(page) {
  const group = page.locator('.settings-group').filter({ hasText: /训练模式|Training mode/ }).first();
  await group.getByRole('button', { name: /^(播客|Podcast)$/ }).click();
}

async function openMockedRoom(viewport, options = {}) {
  const page = await browser.newPage({ viewport });
  await preparePage(page, options.theme ?? 'dark');
  await prepareRoomMock(page, options);
  await page.goto('http://127.0.0.1:4173/#/app?sync=A3F82C', { waitUntil: 'networkidle' });
  const entry = page.locator('.podcast-sync-panel.is-entry');
  await entry.waitFor({ state: 'visible' });
  await entry.getByRole('button', { name: /^(加入房间|Join room)$/ }).click();
  await page.locator('.prompter-shell').waitFor({ state: 'visible' });
  await assertSharedScript(page);
  await page.locator('.podcast-sync-trigger.is-live').waitFor({ state: 'visible' });
  await page.locator('.podcast-sync-trigger.is-live').click();
  await page.locator('.podcast-sync-panel').getByText(/^(成员|People)$/).waitFor({ state: 'visible' });
  return page;
}

await mkdir('../visual-evidence', { recursive: true });

try {
  // One live canary proves the hosted Supabase project actually has Anonymous Sign-Ins enabled.
  const canaryPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await canaryPage.goto('about:blank');
  await canaryPage.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.111.0' });
  const canary = await canaryPage.evaluate(async ({ url, key }) => {
    const client = window.supabase.createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.auth.signInAnonymously({ options: { data: { rhythmcoach_canary: true } } });
    if (result.error) return { error: result.error.message, id: null };
    const id = result.data.user?.id ?? null;
    await client.auth.signOut();
    return { error: null, id };
  }, { url: SUPABASE_URL, key: SUPABASE_KEY });
  if (canary.error || !canary.id) throw new Error(`Live anonymous auth canary failed: ${canary.error ?? 'missing user id'}`);
  console.log(`Anonymous auth canary user: ${canary.id}`);
  await canaryPage.close();

  const basePage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await preparePage(basePage);
  await basePage.goto('http://127.0.0.1:4173/#/', { waitUntil: 'networkidle' });
  await basePage.getByRole('button', { name: /^(Open app|打开应用)$/ }).first().click();
  await basePage.locator('.app-shell').waitFor({ state: 'visible' });
  await basePage.getByRole('button', { name: /^(Start rehearsal|开始训练)$/ }).last().click();
  await basePage.locator('.prompter-shell').waitFor({ state: 'visible' });
  await basePage.close();

  const homeGuest = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await preparePage(homeGuest);
  await prepareRoomMock(homeGuest, { userId: 'member-3', signedIn: false });
  await homeGuest.goto('http://127.0.0.1:4173/#/app', { waitUntil: 'networkidle' });
  await homeGuest.locator('.app-shell').waitFor({ state: 'visible' });
  if (await homeGuest.getByRole('button', { name: /加入房间|Join room/ }).count() !== 0) throw new Error('Join room is visible outside Podcast mode.');
  await choosePodcastMode(homeGuest);
  const homeJoin = homeGuest.getByRole('button', { name: /加入房间|Join room/ }).last();
  const start = homeGuest.getByRole('button', { name: /^(Start rehearsal|开始训练)$/ }).last();
  await homeJoin.waitFor({ state: 'visible' });
  const startBox = await start.boundingBox();
  const joinBox = await homeJoin.boundingBox();
  if (!startBox || !joinBox || joinBox.y <= startBox.y + startBox.height) throw new Error('Join room must sit below Start rehearsal.');
  await homeJoin.click();
  const homeEntry = homeGuest.locator('.podcast-sync-panel.is-entry');
  await homeEntry.waitFor({ state: 'visible' });
  await homeEntry.getByText(/无需登录账号|no account required/i).first().waitFor({ state: 'visible' });
  await homeEntry.locator('input').fill('A3F82C');
  await homeEntry.getByRole('button', { name: /^(加入房间|Join room)$/ }).click();
  await homeGuest.locator('.prompter-shell').waitFor({ state: 'visible' });
  await assertSharedScript(homeGuest);
  await homeGuest.locator('.podcast-sync-trigger.is-live').waitFor({ state: 'visible' });
  if (await homeGuest.locator('.membership-dialog:visible').count()) throw new Error('Guest join opened the membership dialog.');
  await assertFitsViewport(homeGuest, '430x932 guest home join');
  await assertPrompterToolsDoNotOverlap(homeGuest, '430x932 guest home join');
  await homeGuest.screenshot({ path: '../visual-evidence/room-guest-home-joined.png', fullPage: false });
  await homeGuest.close();

  const inviteGuest = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await preparePage(inviteGuest);
  await prepareRoomMock(inviteGuest, { userId: 'member-3', signedIn: false });
  await inviteGuest.goto('http://127.0.0.1:4173/#/app?sync=A3F82C', { waitUntil: 'networkidle' });
  const invitePanel = inviteGuest.locator('.podcast-sync-panel.is-entry');
  await invitePanel.waitFor({ state: 'visible' });
  if ((await invitePanel.locator('.podcast-sync-invite-code strong').textContent())?.trim() !== 'A3F82C') throw new Error('Invite room ID mismatch.');
  if (await invitePanel.getByText(/登录后加入|Sign in to join/i).count()) throw new Error('Invite still requires sign-in.');
  await assertFitsViewport(inviteGuest, '390x844 guest invite');
  await inviteGuest.screenshot({ path: '../visual-evidence/room-invite-guest-mobile.png', fullPage: false });
  await invitePanel.getByRole('button', { name: /^(加入房间|Join room)$/ }).click();
  await inviteGuest.locator('.prompter-shell').waitFor({ state: 'visible' });
  await assertSharedScript(inviteGuest);
  if (new URL(inviteGuest.url()).hash.includes('sync=')) throw new Error('Invite route was not consumed.');
  await inviteGuest.close();

  const lightInvite = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await preparePage(lightInvite, 'light');
  await prepareRoomMock(lightInvite, { userId: 'member-3', signedIn: false });
  await lightInvite.goto('http://127.0.0.1:4173/#/app?sync=A3F82C', { waitUntil: 'networkidle' });
  const lightPanel = lightInvite.locator('.podcast-sync-panel.is-entry');
  await lightPanel.waitFor({ state: 'visible' });
  const bg = await lightPanel.evaluate((element) => getComputedStyle(element).backgroundColor);
  const channels = bg.match(/[\d.]+/g)?.map(Number) ?? [];
  if (channels.length < 3 || channels.slice(0, 3).some((value) => value < 220)) throw new Error(`Light room surface is not light: ${bg}`);
  await lightInvite.screenshot({ path: '../visual-evidence/room-invite-guest-light-mobile.png', fullPage: false });
  await lightInvite.close();

  const createGate = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await preparePage(createGate);
  await prepareRoomMock(createGate, { userId: 'member-3', signedIn: false });
  await createGate.goto('http://127.0.0.1:4173/#/app', { waitUntil: 'networkidle' });
  await choosePodcastMode(createGate);
  await createGate.getByRole('button', { name: /^(Start rehearsal|开始训练)$/ }).last().click();
  await createGate.locator('.prompter-shell').waitFor({ state: 'visible' });
  await createGate.locator('.podcast-sync-trigger').click();
  const createPanel = createGate.locator('.podcast-sync-panel');
  await createPanel.getByText(/创建房间需要账号|account is required to create/i).waitFor({ state: 'visible' });
  await createPanel.getByRole('button', { name: /^(创建房间|Create room)$/ }).click();
  await createGate.locator('.membership-dialog').waitFor({ state: 'visible' });
  await createGate.close();

  const host = await openMockedRoom({ width: 430, height: 932 }, { userId: 'host-1', signedIn: true });
  const hostPanel = host.locator('.podcast-sync-panel');
  await hostPanel.getByText(/^(房间已满|Room is full)$/).waitFor({ state: 'visible' });
  if (await host.locator('.podcast-sync-trigger').getAttribute('data-member-count') !== '4') throw new Error('Room trigger count is not occupied seats.');
  if ((await hostPanel.locator('.podcast-sync-members-heading span').textContent())?.trim() !== '4/4') throw new Error('Room people count mismatch.');
  const switches = hostPanel.locator('.podcast-sync-switch');
  if (await switches.count() !== 3) throw new Error('Host permission controls mismatch.');
  for (let i = 0; i < await switches.count(); i += 1) {
    const box = await switches.nth(i).boundingBox();
    if (!box || box.width < 44 || box.height < 44) throw new Error('Permission switch target is below 44px.');
  }
  const firstSwitch = switches.first();
  if (await firstSwitch.getAttribute('aria-pressed') !== 'true') throw new Error('Second member default permission regressed.');
  await firstSwitch.click();
  if (await firstSwitch.getAttribute('aria-pressed') !== 'false') throw new Error('Host permission switch failed.');
  await assertFitsViewport(host, '430x932 full room');
  await assertPrompterToolsDoNotOverlap(host, '430x932 full room');
  await host.screenshot({ path: '../visual-evidence/room-host-full-mobile.png', fullPage: false });
  await host.keyboard.press('Escape');
  await hostPanel.waitFor({ state: 'hidden' });
  if (!await host.locator('.podcast-sync-trigger').evaluate((element) => document.activeElement === element)) throw new Error('Escape did not restore room trigger focus.');
  await host.close();

  const follower = await openMockedRoom({ width: 390, height: 844 }, { userId: 'member-3', signedIn: false });
  const followerPanel = follower.locator('.podcast-sync-panel');
  await followerPanel.getByText(/暂停了你的滚动权限|scroll access is paused/i).waitFor({ state: 'visible' });
  if (await followerPanel.locator('.podcast-sync-switch').count()) throw new Error('Guest follower sees host permission switches.');
  await follower.screenshot({ path: '../visual-evidence/room-follower-guest-mobile.png', fullPage: false });
  await follower.close();

  const landscape = await openMockedRoom({ width: 844, height: 390 }, { userId: 'host-1', signedIn: true });
  await assertFitsViewport(landscape, '844x390 room');
  await assertPrompterToolsDoNotOverlap(landscape, '844x390 room');
  const landscapePanel = await landscape.locator('.podcast-sync-panel').boundingBox();
  if (!landscapePanel || landscapePanel.y < 0 || landscapePanel.y + landscapePanel.height > 391) throw new Error('Landscape room panel exceeds viewport.');
  await landscape.screenshot({ path: '../visual-evidence/room-host-landscape.png', fullPage: false });
  await landscape.close();

  const keyboard = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await preparePage(keyboard);
  await prepareRoomMock(keyboard, { userId: 'member-3', signedIn: false });
  await keyboard.goto('http://127.0.0.1:4173/#/app', { waitUntil: 'networkidle' });
  await choosePodcastMode(keyboard);
  await keyboard.getByRole('button', { name: /加入房间|Join room/ }).last().click();
  const input = keyboard.locator('.podcast-sync-entry-code input');
  await input.focus();
  await keyboard.setViewportSize({ width: 390, height: 500 });
  const inputBox = await input.boundingBox();
  const joinButtonBox = await keyboard.locator('.podcast-sync-invite-entry .podcast-sync-primary').boundingBox();
  if (!inputBox || !joinButtonBox || inputBox.y + inputBox.height > 500 || joinButtonBox.y + joinButtonBox.height > 500) throw new Error('Join controls are hidden by soft keyboard viewport.');
  await keyboard.screenshot({ path: '../visual-evidence/room-home-keyboard-mobile.png', fullPage: false });
  await keyboard.close();

  const header = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await preparePage(header);
  await header.goto('http://127.0.0.1:4173/#/app', { waitUntil: 'networkidle' });
  await header.locator('.app-shell').waitFor({ state: 'visible' });
  await assertFitsViewport(header, 'mobile app');
  const more = header.getByRole('button', { name: /^(更多|More)$/ });
  await more.click();
  const menu = header.getByRole('menu', { name: /^(更多|More)$/ });
  await menu.waitFor({ state: 'visible' });
  await menu.getByRole('menuitem', { name: /^(切换到白色模式|Switch to light mode)$/ }).click();
  await header.locator("html[data-theme='light']").waitFor({ state: 'attached' });
  await header.getByRole('button', { name: /^(账户|Account)$/ }).click();
  await header.locator('.membership-dialog').waitFor({ state: 'visible' });
  await assertFitsViewport(header, 'mobile account');
  await header.close();

  if (runtimeErrors.length) throw new Error(`Browser runtime errors: ${runtimeErrors.join(' | ')}`);
} finally {
  await browser.close();
}
