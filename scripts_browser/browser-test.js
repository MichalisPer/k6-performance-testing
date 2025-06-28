import { browser } from 'k6/browser';
import { check } from 'https://jslib.k6.io/k6-utils/1.5.0/index.js';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import file from 'k6/x/file';
import { sleep } from 'k6';
import { Trend } from 'k6/metrics';

const loadTimeTrend = new Trend('page_load_time', true);

export const options = {
  scenarios: {
    ui: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5s', target: 10 },  // ramp up to 10 VUs
        { duration: '30s', target: 10 }, // stay at 10 VUs
        { duration: '5s', target: 0 },   // ramp down to 0 VUs
      ],
      gracefulStop: '30s',
      exec: 'default',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate==1.0'],
    page_load_time: ['p(95)<1000'], 
  },
};

export default async function () {
  console.log(__ENV.USER_NAME, __ENV.PASSWORD);
  const cookies = JSON.parse(file.readFile('cookies.json'));
  const context = await browser.newContext();
  await context.addCookies(cookies);
  const page = await context.newPage();

  let start;
  try {
    sleep(randomIntBetween(1, 10) * 0.1); // simulate some think time
    start = Date.now();
    await page.goto('https://quickpizza.grafana.com/login');
    await page.locator('//h2[contains(text(), "Pizza")]').waitFor({ state: 'attached' });
  } finally {
    const loadTime = Date.now() - start; // ms
    loadTimeTrend.add(loadTime);
    const loadTimeSec = loadTime / 1000; // convert to seconds

    await page.close();
    check(loadTimeSec, {
      'load time < 1s': (t) => t < 1,
    });
  }
}

export function handleSummary(data) {
  return {
    "reports/index.html": htmlReport(data)
  };
}