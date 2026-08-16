import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const executablePath = process.env.CHROME_BIN;
if (!executablePath) throw new Error('CHROME_BIN is required for browser smoke.');

const mockSupabaseSdk = `
(() => {
  const user = { id: 'host-1', email: 'host@example.com', user_metadata: { full_name: 'Zhihao' } };
  const profile = { id: 'host-1', display_name: 'Zhihao', avatar_url: null, locale: 'zh', last_seen_at: new Date().toISOString() };
  const room = {
    id: 'room-uuid-1', room_code: 'A3F82C', host_user_id: 'host-1', title: 'Podcast UI audit',
    script: 'Opening.\\nA short script for the UI audit.\\nClosing.', delivery_markup: null,
    expires_at: new Date(Date.now() + 3600000).toISOString()
  };
  let members = [
    { room_id: room.id, user_id: 'host-1', display_name: 'Zhihao', avatar_url: null, can_scroll: true, joined_at: '2026-08-16T10:00:00Z', last_seen_at: new Date().toISOString() },
    { room_id: room.id, user_id: 'member-2', display_name: 'Lindsay', avatar_url: null, can_scroll: true, joined_at: '2026-08-16T10:01:00Z', last_seen_at: new Date().toISOString() },
    { room_id: room.id, user_id: 'member-3', display_name: 'Tintin', avatar_url: null, can_scroll: false, joined_at: '2026-08-16T10:02:00Z', last_seen_at: new Date().toISOString() },
    { room_id: room.id, user_id: 'member-4', display_name: 'Guest', avatar_url: null, can_scroll: false, joined_at: '2026-08-16T10:03:00Z', last_seen_at: new Date().toISOString() }
  ];

  function dataFor(table, single) {
    if (table === 'profiles') return single ? profile : [profile];
    if (table === 'product_accounts') return single ? { user_id: user.id, product_code: 'rhythmcoach', preferences: {}, state: {}, first_seen_at: '2026-08-01T00:00:00Z', last_seen_at: new Date().toISOString() } : [];
    if (table === 'entitlements' || table === 'subscriptions') return [];
    if (table === 'rhythmcoach_sync_rooms') return single ? room : [room];
    if (table === 'rhythmcoach_sync_members') return members;
    return single ? null : [];
  }

  function builder(table) {
    const api = {
      select() { return api; }, insert() { return api; }, update() { return api; }, upsert() { return api; },
      eq() { return api; }, order() { return api; },
      maybeSingle() { return Promise.resolve({ data: dataFor(table, true), error: null }); },
      single() { return Promise.resolve({ data: dataFor(table, true), error: null }); },
      then(resolve, reject) { return Promise.resolve({ data: dataFor(table, false), error: null }).then(resolve, reject); }
    };
    return api;
  }

  function makeChannel() {
    const listeners = [];
    const channel = {
      on(type, filter, callback) { listeners.push({ type, filter, callback }); return channel; },
      subscribe(callback) {
        setTimeout(() => {
          callback?.('SUBSCRIBED');
          listeners.filter((listener) => listener.type === 'presence' && listener.filter?.event === 'sync')
            .forEach((listener) => listener.callback({}));
        }, 20);
        return channel;
      },
      send() { return Promise.resolve('ok'); },
      track() { return Promise.resolve('ok'); },
      presenceState() {
        return {
          'host-1': [{ user_id: 'host-1' }], 'member-2': [{ user_id: 'member-2' }],
          'member-3': [{ user_id: 'member-3' }], 'member-4': [{ user_id: 'member-4' }]
        };
      }
    };
    return channel;
  }

  const client = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user, access_token: 'fake-token' } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOAuth: () => Promise.resolve({ error: null }), signInWithOtp: () => Promise.resolve({ error: null }), signOut: () => Promise.resolve({ error: null })
    },
    from: (table) => builder(table),
    rpc: (fn, params = {}) => {
      if (fn === 'rhythmcoach_join_sync_room' || fn === 'rhythmcoach_create_sync_room') {
        return Promise.resolve({ data: { room_id: room.id, room_code: room.room_code }, error: null });
      }
      if (fn === 'rhythmcoach_set_sync_scroll_permission') {
        members = members.map((member) => member.user_id === params.p_member_user_id ? { ...member, can_scroll: params.p_can_scroll } : member);
      }
      return Promise.resolve({ data: null, error: null });
    },
    channel: () => makeChannel(),
    removeChannel: () => Promise.resolve('ok')
  };
  window.supabase = { createClient: () => client };
})();
`;

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox'],
});

const setBaseState = async (page, theme = 'dark') => {
  await page.addInitScript(({ theme }) => {
    localStorage.setItem('rhythmcoach_product_guide_v1', 'complete');
    localStorage.setItem('rhythmcoach_theme_v1', theme);
  }, { theme });
};

const mockSupabase = async (page) => {
  await page.route('https://cdn.jsdelivr.net/**', async (route) => {
    if (route.request().url().includes('@supabase/supabase-js')) {
      await route.fulfill({ status: 200, contentType: 'application/javascript', body: mockSupabaseSdk });
      return;
    }
    await route.continue();
  });
};

try {
  await mkdir('../visual-evidence', { recursive: true });
  const runtimeErrors = [];

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await setBaseState(page);

  await page.goto('http://127.0.0.1:4173/#/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^(Open app|打开应用)$/ }).first().click();
  await page.locator('.app-shell').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /^(Start rehearsal|开始训练)$/ }).last().click();
  await page.locator('.prompter-shell').waitFor({ state: 'visible' });

  await page.goto('http://127.0.0.1:4173/#/app?sync=A3F82C', { waitUntil: 'networkidle' });
  await page.locator('.prompter-shell').waitFor({ state: 'visible' });
  const invitePanel = page.locator('.podcast-sync-panel.is-invite');
  await invitePanel.waitFor({ state: 'visible' });
  const inviteCode = await invitePanel.locator('.podcast-sync-invite-code strong').textContent();
  if (inviteCode?.trim() !== 'A3F82C') throw new Error(`Podcast invite room ID mismatch: ${inviteCode}`);

  await page.setViewportSize({ width: 390, height: 844 });
  if (!await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)) {
    throw new Error('Mobile podcast invite surface overflows horizontally.');
  }
  await page.screenshot({ path: '../visual-evidence/room-invite-dark-mobile.png', fullPage: false });
  await page.close();

  const lightRoomPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  lightRoomPage.on('pageerror', (error) => runtimeErrors.push(error.message));
  await setBaseState(lightRoomPage, 'light');
  await lightRoomPage.goto('http://127.0.0.1:4173/#/app?sync=A3F82C', { waitUntil: 'networkidle' });
  await lightRoomPage.locator('.podcast-sync-panel.is-invite').waitFor({ state: 'visible' });
  await lightRoomPage.screenshot({ path: '../visual-evidence/room-invite-light-mobile.png', fullPage: false });
  await lightRoomPage.close();

  const roomPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  roomPage.on('pageerror', (error) => runtimeErrors.push(error.message));
  await setBaseState(roomPage, 'dark');
  await mockSupabase(roomPage);
  await roomPage.goto('http://127.0.0.1:4173/#/app?sync=A3F82C', { waitUntil: 'networkidle' });
  await roomPage.locator('.podcast-sync-panel.is-invite').waitFor({ state: 'visible' });
  const joinButton = roomPage.getByRole('button', { name: /^(加入房间|Join room)$/ });
  await joinButton.waitFor({ state: 'visible' });
  await joinButton.click();
  await roomPage.locator('.podcast-sync-room').waitFor({ state: 'visible' });
  await roomPage.locator('.podcast-sync-member').nth(3).waitFor({ state: 'visible' });
  await roomPage.screenshot({ path: '../visual-evidence/room-active-host-4p-mobile.png', fullPage: false });
  await roomPage.close();

  const roomDesktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  roomDesktop.on('pageerror', (error) => runtimeErrors.push(error.message));
  await setBaseState(roomDesktop, 'dark');
  await mockSupabase(roomDesktop);
  await roomDesktop.goto('http://127.0.0.1:4173/#/app?sync=A3F82C', { waitUntil: 'networkidle' });
  await roomDesktop.getByRole('button', { name: /^(加入房间|Join room)$/ }).click();
  await roomDesktop.locator('.podcast-sync-room').waitFor({ state: 'visible' });
  await roomDesktop.screenshot({ path: '../visual-evidence/room-active-host-4p-desktop.png', fullPage: false });
  await roomDesktop.close();

  const headerPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  headerPage.on('pageerror', (error) => runtimeErrors.push(error.message));
  await setBaseState(headerPage);
  await headerPage.goto('http://127.0.0.1:4173/#/app', { waitUntil: 'networkidle' });
  await headerPage.locator('.app-shell').waitFor({ state: 'visible' });
  if (!await headerPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)) {
    throw new Error('Mobile app surface overflows horizontally.');
  }
  await headerPage.close();

  if (runtimeErrors.length) {
    throw new Error(`Browser runtime errors: ${runtimeErrors.join(' | ')}`);
  }
} finally {
  await browser.close();
}
