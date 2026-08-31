const fs = require('fs');
const path = require('path');

function resolveChromeExecutable() {
  const BAD = ['/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/chromium'];
  const candidates = [
    '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome',
  ];

  const explicit = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const explicitOk = explicit && fs.existsSync(explicit) && !BAD.includes(explicit);
  if (explicitOk) return explicit;

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  if (explicit && fs.existsSync(explicit)) return explicit;
  return undefined;
}

const LAUNCH_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-infobars',
  '--window-size=1920,1080',
  '--lang=en-US',
];

module.exports = { resolveChromeExecutable, LAUNCH_ARGS };
