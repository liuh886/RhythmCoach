import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const executablePath = process.env.CHROME_BIN;
if (!executablePath) throw new Error('CHROME_BIN is required for browser smoke.');

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox'],
});

const runtimeErrors = [];

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
      id: 'room-1',
      room_code: 'A3F82C',
      host_user_id: 'host-1',
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
      id: activeUserId,
      email: `${activeUserId}@example.com`,
      is_anonymous: false,
      user_metadata: { full_name: memberData.find((member) => member.user_id === activeUserId)?.display_name ?? 'Member' }
    };
    const anonymousUser = {
      id: activeUserId,
      email: null,
      is_anonymous: true,
      user_metadata: { full_name: memberData.find((member) => member.user_id === activeUserId)?.display_name ?? 'Guest 3A7F' }
    };
    const profile = {
      id: activeUserId,
      display_name: permanentUser.user_metadata.full_name,
      avatar_url: null,
      locale: 'zh',
      last_seen_at: new Date().toISOString()
    };
    const productAccount = {
      user_id: activeUserId,
      product_code: 'rhythmcoach',
      preferences: {},
      state: {},
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    };
    let currentSession = hasPermanentSession
      ? { user: permanentUser, access_token: 'test-token' }
      : null;
    const authListeners = [];

    const resultForTable = (table, single) => {
      if (table === 'profiles') return single ? profile : [profile];
      if (table === 'product_accounts') return single ? productAccount : [productAccount];
      if (table === 'entitlements' || table === 'subscriptions') return single ? null : [];
      if (table === 'rhythmcoach_sync_rooms') return single ? room : [room];
      if (table === 'rhythmcoach_sync_members') return single ? memberData[0] : memberData.map((member) => ({ ...member }));
      return single ? null : [];
    };

    const createBuilder = (table) => {
      const builder = {
        select: () => builder,
        insert: () => builder,
        update: () => builder,
        upsert: () => builder,
        eq: () => builder,
        order: () => builder,
        maybeSingle: async () => ({ data: resultForTable(table, true), error: null }),
        single: async () => ({ data: resultForTable(table, true), error: null }),
        then: (resolve, reject) => Promise.resolve({ data: resultForTable(table, false), error: null }).then(resolve, reject)
      };
      return builder;
    };

    const createChannel = () => {
      const callbacks = [];
      const channel = {
        on(type, filter, callback) {
          callbacks.push({ type, event: filter.event, callback });
          return channel;
        },
        subscribe(callback) {
          window.setTimeout(() => callback?.('SUBSCRIBED'), 0);
          return channel;
        },
        send: async () => 'ok',
        track: async () => {
          window.setTimeout(() => {
            callbacks
              .filter((entry) => entry.type === 'presence' && entry.event === 'sync')
              .forEach((entry) => entry.callback({}));
          }, 0);
          return 'ok';
        },
        presenceState: () => ({ room: memberData.map((member) => ({ user_id: member.user_id })) })
      };
      return channel;
    };

    const client = {
      auth: {
        getSession: async () => ({ data: { session: currentSession }, error: null }),
        onAuthStateChange: (callback) => {
          authListeners.push(callback);
          return { data: { subscription: { unsubscribe() {} } } };
        },
        signInAnonymously: async () => {
          currentSession = { user: anonymousUser, access_token: 'guest-token' };
          authListeners.forEach((callback) => callback('SIGNED_IN', currentSession));
          return { data: { user: anonymousUser, session: currentSession }, error: null };
        },
        signInWithOAuth: async () => ({ error: null }),
        signInWithOtp: async () => ({ error: null }),
        signOut: async () => ({ error: null })
      },
      from: (table) => createBuilder(table),
      rpc: async (fn, params = {}) => {
        if (fn === 'rhythmcoach_join_sync_room' || fn === 'rhythmcoach_create_sync_room') {
          return { data: { room_id: room.id, room_code: room.room_code }, error: null };
        }
        if (fn === 'rhythmcoach_set_sync_scroll_permission') {
          const member = memberData.find((item) => item.user_id === params.p_member_user_id);
          if (member) member.can_scroll = Boolean(params.p_can_scroll);
        }
        return { data: null, error: null };
      },
      channel: () => createChannel(),
      removeChannel: async () => 'ok'
    };

    window.supabase = { createClient: () => client };
  }, { activeUserId: userId, hasPermanentSession: signedIn });
}

function overlaps(first, second) {
  if (!first || !second) return false;
  return !(
    first.x + first.width <= second.x
    || second.x + second.width <= first.x
    || first.y + first.height <= second.y
    || second.y + second.height <= first.y
  );
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
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  if (!fits) throw new Error(`${label}: surface overflows horizontally.`);
}

async function choosePodcastMode(page) {
  const trainingModeGroup = page.locator('.settings-group').filter({ hasText: /训练模式|Training mode/ }).first();
  await trainingModeGroup.getByRole('button', { name: /^(播客|Podcast)$/ }).click();
}

async function openMockedRoom(viewport, { theme = 'dark', userId = 'host-1', signedIn = true } = {}) {
  const page = await browser.newPage({ viewport });
  await preparePage(page, theme);
  await prepareRoomMock(page, { userId, signedIn });
  await page.goto('http://127.0.0.1:4173/#/app?sync=A3F82C', { waitUntil: 'networkidle' });
  const entryPanel = page.locator('.podcast-sync-panel.is-entry');
  await entryPanel.waitFor({ state: 'visible' });
  await entryPanel.getByRole('button', { name: /^(加入房间|Join room)$/ }).click();
  await page.locator('.prompter-shell').waitFor({ state: 'visible' });
  await page.locator('.podcast-sync-trigger.is-live').waitFor({ state: 'visible' });
  await page.locator('.podcast-sync-trigger.is-live').click();
  const panel = page.locator('.podcast-sync-panel');
  await panel.getByText(/^(成员|People)$/).waitFor({ state: 'visible' });
  return page;
}

await mkdir('../visual-evidence', { recursive: true });

try {
  const basePage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await preparePage(basePage);
  await basePage.goto('http://127.0.0.1:4173/#/', { waitUntil: 'networkidle' });
  await basePage.getByRole('button', { name: /^(Open app|打开应用)$/ }).first().click();
  await basePage.locator('.app-shell').waitFor({ state: 'visible' });
  await basePage.getByRole('button', { name: /^(Start rehearsal|开始训练)$/ }).last().click();
  await basePage.locator('.prompter-shell').waitFor({ state: 'visible' });
  await basePage.close();

  const homeGuestPage = await browser.newPage({ viewport: { width: 430, height: 932 } });
  await preparePage(homeGuestPage);
  await prepareRoomMock(homeGuestPage, { userId: 'member-3', signedIn: false });
  await homeGuestPage.goto('http://127.0.0.1:4173/#/app', { waitUntil: 'networkidle' });
  await homeGuestPage.locator('.app-shell').waitFor({ state: 'visible' });
  if (await homeGuestPage.getByRole('button', { name: /^(加入房间|Join room)$/ }).count() !== 0) {
    throw new Error('Join room must not appear before Podcast mode is selected.');
  }
  await choosePodcastMode(homeGuestPage);
  const homeJoinButton = homeGuestPage.getByRole('button', { name: /加入房间|Join room/ }).last();
  await homeJoinButton.waitFor({ state: 'visible' });
  const startBox = await homeGuestPage.getByRole('button', { name: /^(Start rehearsal|开始训练)$/ }).last().boundingBox();
  const joinBox = await homeJoinButton.boundingBox();
  if (!startBox || !joinBox || joinBox.y <= startBox.y + startBox.height) {
    throw new Error('Join room CTA must sit below Start rehearsal in Podcast mode.');
  }
  await homeJoinButton.click();
  const homeEntryPanel = homeGuestPage.locator('.podcast-sync-panel.is-entry');
  await homeEntryPanel.waitFor({ state: 'visible' });
  await homeEntryPanel.getByText(/无需登录账号|no account required/i).first().waitFor({ state: 'visible' });
  if (await homeGuestPage.locator('.membership-dialog').count() && await homeGuestPage.locator('.membership-dialog').isVisible()) {
    throw new Error('Guest join must not open the membership dialog.');
  }
  await homeEntryPanel.locator('input[aria-label="房间 ID"], input[aria-label="Room ID"]').fill('A3F82C');
  await homeEntryPanel.getByRole('button', { name: /^(加入房间|Join room)$/ }).click();
  await homeGuestPage.locator('.prompter-shell').waitFor({ state: 'visible' });
  await homeGuestPage.getByText('A shared script for room UI quality verification.').waitFor({ state: 'visible' });
  await homeGuestPage.locator('.podcast-sync-trigger.is-live').waitFor({ state: 'visible' });
  await assertFitsViewport(homeGuestPage, '430x932 guest home join');
  await assertPrompterToolsDoNotOverlap(homeGuestPage, '430x932 guest home join');
  await homeGuestPage.screenshot({ path: '../visual-evidence/room-guest-home-joined.png', fullPage: false });
  await homeGuestPage.close();

  const inviteGuestPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await preparePage(inviteGuestPage);
  await prepareRoomMock(inviteGuestPage, { userId: 'member-3', signedIn: false });
  await inviteGuestPage.goto('http://127.0.0.1:4173/#/app?sync=A3F82C', { waitUntil: 'networkidle' });
  await inviteGuestPage.locator('.app-shell').waitFor({ state: 'visible' });
  const invitePanel = inviteGuestPage.locator('.podcast-sync-panel.is-entry');
  await invitePanel.waitFor({ state: 'visible' });
  const inviteCode = await invitePanel.locator('.podcast-sync-invite-code strong').textContent();
  if (inviteCode?.trim() !== 'A3F82C') throw new Error(`Podcast invite room ID mismatch: ${inviteCode}`);
  if (await invitePanel.getByText(/登录后加入|Sign in to join/i).count()) throw new Error('Invite flow still contains sign-in-to-join copy.');
  await inviteGuestPage.locator('.podcast-sync-backdrop').waitFor({ state: 'visible' });
  await assertFitsViewport(inviteGuestPage, '390x844 guest invite');
  const inviteBox = await invitePanel.boundingBox();
  if (!inviteBox || inviteBox.y + inviteBox.height > 844 + 1) throw new Error('Mobile invite sheet exceeds the visual viewport.');
  await inviteGuestPage.screenshot({ path: '../visual-evidence/room-invite-guest-mobile.png', fullPage: false });
  await invitePanel.getByRole('button', { name: /^(加入房间|Join room)$/ }).click();
  await inviteGuestPage.locator('.prompter-shell').waitFor({ state: 'visible' });
  await inviteGuestPage.getByText('A shared script for room UI quality verification.').waitFor({ state: 'visible' });
  if (new URL(inviteGuestPage.url()).hash.includes('sync=')) throw new Error('Invite route was not consumed after joining.');
  await inviteGuestPage.close();

  const lightInvitePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await preparePage(lightInvitePage, 'light');
  await prepareRoomMock(lightInvitePage, { userId: 'member-3', signedIn: false });
  await lightInvitePage.goto('http://127.0.0.1:4173/#/app?sync=A3F82C', { waitUntil: 'networkidle' });
  const lightPanel = lightInvitePage.locator('.podcast-sync-panel.is-entry');
  await lightPanel.waitFor({ state: 'visible' });
  const lightPanelBackground = await lightPanel.evaluate((element) => getComputedStyle(element).backgroundColor);
  const lightChannels = lightPanelBackground.match(/[\d.]+/g)?.map(Number) ?? [];
  if (lightChannels.length < 3 || lightChannels[0] < 220 || lightChannels[1] < 220 || lightChannels[2] < 220) {
    throw new Error(`Light room surface did not use the product light theme: ${lightPanelBackground}`);
  }
  await lightInvitePage.screenshot({ path: '../visual-evidence/room-invite-guest-light-mobile.png', fullPage: false });
  await lightInvitePage.close();

  const createGatePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await preparePage(createGatePage);
  await prepareRoomMock(createGatePage, { userId: 'member-3', signedIn: false });
  await createGatePage.goto('http://127.0.0.1:4173/#/app', { waitUntil: 'networkidle' });
  await choosePodcastMode(createGatePage);
  await createGatePage.getByRole('button', { name: /^(Start rehearsal|开始训练)$/ }).last().click();
  await createGatePage.locator('.prompter-shell').waitFor({ state: 'visible' });
  await createGatePage.locator('.podcast-sync-trigger').click();
  const createPanel = createGatePage.locator('.podcast-sync-panel');
  await createPanel.getByText(/创建房间需要账号|account is required to create/i).waitFor({ state: 'visible' });
  await createPanel.getByRole('button', { name: /^(创建房间|Create room)$/ }).click();
  await createGatePage.locator('.membership-dialog').waitFor({ state: 'visible' });
  await createGatePage.close();

  const hostPage = await openMockedRoom({ width: 430, height: 932 }, { userId: 'host-1', signedIn: true });
  const hostPanel = hostPage.locator('.podcast-sync-panel');
  await hostPanel.getByText(/^(房间已满|Room is full)$/).waitFor({ state: 'visible' });
  if (await hostPage.locator('.podcast-sync-trigger').getAttribute('data-member-count') !== '4') {
    throw new Error('Room trigger count must represent occupied seats.');
  }
  const peopleCount = await hostPanel.locator('.podcast-sync-members-heading span').textContent();
  if (peopleCount?.trim() !== '4/4') throw new Error(`Room people count mismatch: ${peopleCount}`);
  const memberSubtitles = await hostPanel.locator('.podcast-sync-member-name span').allTextContents();
  if (memberSubtitles.some((text) => /可滚动|仅跟随|Can scroll|Follow only/.test(text))) {
    throw new Error('Member subtitle duplicates the permission state.');
  }
  const switches = hostPanel.locator('.podcast-sync-switch');
  if (await switches.count() !== 3) throw new Error('Host should see one permission switch for each non-host member.');
  for (let index = 0; index < await switches.count(); index += 1) {
    const box = await switches.nth(index).boundingBox();
    if (!box || box.width < 44 || box.height < 44) throw new Error('Permission switch touch target is smaller than 44px.');
  }
  const firstSwitch = switches.first();
  if (await firstSwitch.getAttribute('aria-pressed') !== 'true') throw new Error('Second member should start with scroll permission.');
  await firstSwitch.click();
  if (await firstSwitch.getAttribute('aria-pressed') !== 'false') throw new Error('Host permission switch did not update its state.');
  await assertFitsViewport(hostPage, '430x932 full room');
  await assertPrompterToolsDoNotOverlap(hostPage, '430x932 full room');
  await hostPage.screenshot({ path: '../visual-evidence/room-host-full-mobile.png', fullPage: false });
  await hostPage.keyboard.press('Escape');
  await hostPanel.waitFor({ state: 'hidden' });
  const triggerFocused = await hostPage.locator('.podcast-sync-trigger').evaluate((element) => document.activeElement === element);
  if (!triggerFocused) throw new Error('Closing the room panel with Escape did not restore focus to the room trigger.');
  await hostPage.close();

  const followerPage = await openMockedRoom(
    { width: 390, height: 844 },
    { userId: 'member-3', signedIn: false }
  );
  const followerPanel = followerPage.locator('.podcast-sync-panel');
  await followerPanel.getByText(/暂停了你的滚动权限|scroll access is paused/i).waitFor({ state: 'visible' });
  if (await followerPanel.locator('.podcast-sync-switch').count() !== 0) throw new Error('Followers must not see host permission switches.');
  await followerPage.screenshot({ path: '../visual-evidence/room-follower-guest-mobile.png', fullPage: false });
  await followerPage.close();

  const landscapePage = await openMockedRoom({ width: 844, height: 390 }, { userId: 'host-1', signedIn: true });
  await assertFitsViewport(landscapePage, '844x390 room');
  await assertPrompterToolsDoNotOverlap(landscapePage, '844x390 room');
  const landscapePanel = await landscapePage.locator('.podcast-sync-panel').boundingBox();
  if (!landscapePanel || landscapePanel.y < 0 || landscapePanel.y + landscapePanel.height > 390 + 1) {
    throw new Error('Landscape room panel exceeds the visual viewport.');
  }
  await landscapePage.screenshot({ path: '../visual-evidence/room-host-landscape.png', fullPage: false });
  await landscapePage.close();

  const desktopRoomPage = await openMockedRoom({ width: 1440, height: 1000 }, { userId: 'host-1', signedIn: true });
  await assertPrompterToolsDoNotOverlap(desktopRoomPage, '1440x1000 room');
  await desktopRoomPage.screenshot({ path: '../visual-evidence/room-host-desktop.png', fullPage: false });
  await desktopRoomPage.close();

  const keyboardPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await preparePage(keyboardPage);
  await prepareRoomMock(keyboardPage, { userId: 'member-3', signedIn: false });
  await keyboardPage.goto('http://127.0.0.1:4173/#/app', { waitUntil: 'networkidle' });
  await choosePodcastMode(keyboardPage);
  await keyboardPage.getByRole('button', { name: /加入房间|Join room/ }).last().click();
  const roomIdInput = keyboardPage.locator('.podcast-sync-entry-code input');
  await roomIdInput.waitFor({ state: 'visible' });
  await roomIdInput.focus();
  await keyboardPage.setViewportSize({ width: 390, height: 500 });
  const inputBox = await roomIdInput.boundingBox();
  const joinButtonBox = await keyboardPage.locator('.podcast-sync-invite-entry .podcast-sync-primary').boundingBox();
  if (!inputBox || !joinButtonBox || inputBox.y + inputBox.height > 500 || joinButtonBox.y + joinButtonBox.height > 500) {
    throw new Error('Home room ID input or Join CTA is hidden when the visual viewport shrinks for the soft keyboard.');
  }
  await keyboardPage.screenshot({ path: '../visual-evidence/room-home-keyboard-mobile.png', fullPage: false });
  await keyboardPage.close();

  const headerPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await preparePage(headerPage);
  await headerPage.goto('http://127.0.0.1:4173/#/app', { waitUntil: 'networkidle' });
  await headerPage.locator('.app-shell').waitFor({ state: 'visible' });
  await assertFitsViewport(headerPage, 'mobile app');
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
  await assertFitsViewport(headerPage, 'mobile account');
  await headerPage.screenshot({ path: '../visual-evidence/account-light-mobile.png', fullPage: false });
  await headerPage.close();

  if (runtimeErrors.length) {
    throw new Error(`Browser runtime errors: ${runtimeErrors.join(' | ')}`);
  }
} finally {
  await browser.close();
}
