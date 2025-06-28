import { browser } from 'k6/browser';
import file from 'k6/x/file';

export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 1,
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate==1.0'],
  },
};

export default async function () {
  console.log(__ENV.USER_NAME, __ENV.PASSWORD);
  const context = await browser.newContext({
  launchOptions: {
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  },
});
  const page = await context.newPage();

  try {
    await page.goto('https://quickpizza.grafana.com/login', { waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: 'reports/before_login.png' });

    await page.locator('input[name="username"]').type(__ENV.USER_NAME, { delay: 100 });
    await page.locator('input[name="password"]').type(__ENV.PASSWORD, { delay: 100 });
    await page.locator('button[type="submit"]').click();
    await page.locator('//h2[contains(text(), "Pizza")]').waitFor({ state: 'visible' });
    await page.screenshot({ path: 'reports/after_login.png' });

    const storgage = await page.context().cookies();
    file.writeString('cookies.json', JSON.stringify(storgage, null, 2));
  } finally {
    await page.close();
  }
}