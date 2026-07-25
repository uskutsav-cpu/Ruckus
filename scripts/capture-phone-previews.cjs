const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function loadPlaywright() {
  try {
    return require('playwright');
  } catch {
    const codexPlaywright = path.join(
      os.homedir(),
      '.cache',
      'codex-runtimes',
      'codex-primary-runtime',
      'dependencies',
      'node',
      'node_modules',
      'playwright'
    );
    if (fs.existsSync(codexPlaywright)) return require(codexPlaywright);
    throw new Error(
      'Playwright is unavailable. Install it as a dev dependency, then rerun npm run preview:phones.'
    );
  }
}

const { chromium } = loadPlaywright();
const projectRoot = path.resolve(__dirname, '..');
const outputRoot = path.join(projectRoot, 'artifacts', 'phone-preview');
const baseUrl = process.env.RUCKUS_PREVIEW_URL ?? 'http://localhost:8081';
const groupId = '50000000-0000-4000-8000-000000000001';
const activityId = '40000000-0000-4000-8000-000000000001';

const devices = [
  {
    id: 'iphone',
    label: 'iPhone',
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3
  },
  {
    id: 'android',
    label: 'Android',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.6
  }
];

const rows = [
  ['welcome-light', 'Welcome · Light'],
  ['sign-in-light', 'Sign in · Light'],
  ['onboarding-light', 'Onboarding · Light'],
  ['activity-deck-light', 'Activity deck · Light'],
  ['activity-details-light', 'Activity details · Light'],
  ['pending-activities-light', 'Pending activities · Light'],
  ['confirmed-groups-light', 'Confirmed groups · Light'],
  ['group-lobby-light', 'Group lobby · Light'],
  ['chat-light', 'Chat · Light'],
  ['check-in-light', 'Check-in · Light'],
  ['profile-light', 'Profile · Light'],
  ['leaderboard-light', 'Leaderboard · Light'],
  ['safety-center-light', 'Safety center · Light'],
  ['settings-light', 'Settings · Light'],
  ['account-deletion-light', 'Account deletion · Light'],
  ['welcome-dark', 'Welcome · Dark'],
  ['activity-deck-dark', 'Activity deck · Dark'],
  ['group-lobby-dark', 'Group lobby · Dark'],
  ['chat-dark', 'Chat · Dark'],
  ['profile-dark', 'Profile · Dark'],
  ['settings-dark', 'Settings · Dark']
];

async function launchBrowser() {
  const options = { headless: true };
  if (process.env.PLAYWRIGHT_CHROME_PATH) {
    options.executablePath = process.env.PLAYWRIGHT_CHROME_PATH;
  } else {
    options.channel = 'chrome';
  }
  try {
    return await chromium.launch(options);
  } catch (error) {
    if (options.channel) return chromium.launch({ headless: true });
    throw error;
  }
}

async function settle(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(650);
}

async function open(page, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
  await settle(page);
}

async function capture(page, device, slug) {
  const destination = path.join(outputRoot, device.id, `${slug}.png`);
  await page.screenshot({
    path: destination,
    fullPage: false,
    animations: 'disabled'
  });
  console.log(`Captured ${device.label}: ${slug}`);
}

async function enterDemo(page) {
  await open(page, '/welcome');
  await page.getByRole('button', { name: 'Enter local demo' }).click();
  await page.waitForURL('**/deck');
  await settle(page);
}

async function captureAuthScreens(browser, device) {
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
    timezoneId: 'America/Chicago'
  });
  const page = await context.newPage();
  await open(page, '/welcome');
  await capture(page, device, 'welcome-light');
  await open(page, '/sign-in');
  await capture(page, device, 'sign-in-light');
  await context.close();

  const onboardingContext = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
    timezoneId: 'America/Chicago'
  });
  const onboardingPage = await onboardingContext.newPage();
  await open(onboardingPage, '/onboarding?phonePreview=onboarding');
  await onboardingPage.getByText('How should we introduce you?').waitFor();
  await capture(onboardingPage, device, 'onboarding-light');
  await onboardingContext.close();
}

async function captureAppScreens(browser, device, colorScheme) {
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    colorScheme,
    reducedMotion: 'reduce',
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    permissions: []
  });
  const page = await context.newPage();
  await enterDemo(page);

  if (colorScheme === 'dark') {
    await capture(page, device, 'activity-deck-dark');
    await open(page, `/group/${groupId}?phonePreview=confirmed`);
    await capture(page, device, 'group-lobby-dark');
    await open(page, `/group/${groupId}/chat`);
    await capture(page, device, 'chat-dark');
    await open(page, '/profile');
    await capture(page, device, 'profile-dark');
    await open(page, '/settings');
    await capture(page, device, 'settings-dark');
    await context.close();
    return;
  }

  await capture(page, device, 'activity-deck-light');
  await open(page, `/activity/${activityId}`);
  await capture(page, device, 'activity-details-light');
  await open(page, '/pending');
  await capture(page, device, 'pending-activities-light');
  await open(page, '/groups?phonePreview=confirmed');
  await capture(page, device, 'confirmed-groups-light');
  await open(page, `/group/${groupId}?phonePreview=confirmed`);
  await capture(page, device, 'group-lobby-light');
  await open(page, `/group/${groupId}/chat`);
  await capture(page, device, 'chat-light');
  await open(page, `/check-in/${groupId}`);
  await capture(page, device, 'check-in-light');
  await open(page, '/profile');
  await capture(page, device, 'profile-light');
  await open(page, '/leaderboard');
  await capture(page, device, 'leaderboard-light');
  await open(page, '/safety');
  await capture(page, device, 'safety-center-light');
  await open(page, '/settings');
  await capture(page, device, 'settings-light');
  await open(page, '/account-deletion');
  await capture(page, device, 'account-deletion-light');
  await context.close();
}

async function captureDarkWelcome(browser, device) {
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.deviceScaleFactor,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    isMobile: true,
    hasTouch: true,
    locale: 'en-US',
    timezoneId: 'America/Chicago'
  });
  const page = await context.newPage();
  await open(page, '/welcome');
  await capture(page, device, 'welcome-dark');
  await context.close();
}

function writeContactSheet() {
  const cards = rows
    .map(
      ([slug, label]) => `
        <section class="row">
          <header>
            <h2>${label}</h2>
            <code>${slug}</code>
          </header>
          <figure>
            <figcaption>iPhone · 393 × 852 · 3×</figcaption>
            <img src="iphone/${slug}.png" alt="${label} on iPhone" />
          </figure>
          <figure>
            <figcaption>Android · 412 × 915 · 2.6×</figcaption>
            <img src="android/${slug}.png" alt="${label} on Android" />
          </figure>
        </section>`
    )
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Ruckus phone preview</title>
    <style>
      :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #191b1a; background: #f2f3f0; }
      main { width: min(1180px, 100%); margin: 0 auto; padding: 48px 24px 96px; }
      h1 { margin: 0; font-size: clamp(32px, 5vw, 52px); letter-spacing: -0.04em; }
      .intro { max-width: 720px; margin: 12px 0 40px; color: #5f6662; font-size: 17px; line-height: 1.55; }
      .row { display: grid; grid-template-columns: 180px minmax(0, 1fr) minmax(0, 1fr); gap: 24px; align-items: start; padding: 32px 0; border-top: 1px solid #d8dcd8; }
      h2 { margin: 0 0 8px; font-size: 20px; }
      code { color: #68706b; font-size: 12px; }
      figure { margin: 0; }
      figcaption { margin-bottom: 10px; color: #68706b; font-size: 13px; }
      img { display: block; width: 100%; height: auto; border: 1px solid #cfd3cf; border-radius: 18px; background: #fff; box-shadow: 0 10px 30px rgba(27, 34, 29, 0.08); }
      @media (max-width: 780px) {
        main { padding-inline: 16px; }
        .row { grid-template-columns: 1fr; }
        .row header { position: static; }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Ruckus phone preview</h1>
      <p class="intro">Live Expo web runtime captures using stable local demo data. Browser captures are for fast visual review and are not a substitute for native-device QA.</p>
      ${cards}
    </main>
  </body>
</html>`;
  fs.writeFileSync(path.join(outputRoot, 'index.html'), html);
}

async function main() {
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const device of devices) {
    fs.mkdirSync(path.join(outputRoot, device.id), { recursive: true });
  }

  const browser = await launchBrowser();
  try {
    for (const device of devices) {
      await captureAuthScreens(browser, device);
      await captureAppScreens(browser, device, 'light');
      await captureDarkWelcome(browser, device);
      await captureAppScreens(browser, device, 'dark');
    }
  } finally {
    await browser.close();
  }
  writeContactSheet();
  console.log(`Contact sheet: ${path.join(outputRoot, 'index.html')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
