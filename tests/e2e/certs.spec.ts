import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

const NAME = 'Claude Certified Architect';
const nbsp = (s: string) => s.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

const LOCALES = [
  {
    skills: '/skills/',
    exp: '/experiences/',
    print: '/experiences/print/',
    sub: 'Anthropic · Planned · Apr 2027',
    status: 'Planned',
    printText: `${NAME} (Planned · Apr 2027)`,
  },
  {
    skills: '/vi/skills/',
    exp: '/vi/experiences/',
    print: '/vi/experiences/print/',
    sub: 'Anthropic · Dự kiến · 04/2027',
    status: 'Dự kiến',
    printText: `${NAME} (Dự kiến · 04/2027)`,
  },
];

async function gotoThemed(page: Page, path: string, theme: 'light' | 'dark') {
  await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
}

for (const L of LOCALES) {
  test.describe(`Planned certification ${L.skills}`, () => {
    // owner, photo-logos: old title "... and no link, logo or ID". The owner reversed the earlier
    // "no logo on the planned certification": it carries the Claude mark (not Anthropic's), still no
    // link or ID.
    test('is the last of three items, with status and date, the Claude mark and no link or ID', async ({
      page,
    }) => {
      await page.goto(L.skills);
      const items = page.locator('#certifications [data-spec-items] > li');
      await expect(items).toHaveCount(3);
      const planned = items.last();
      await expect(planned).toHaveAttribute('data-planned', '');
      await expect(items.locator('[data-planned]')).toHaveCount(0);
      await expect(page.locator('#certifications [data-planned]')).toHaveCount(1);
      await expect(planned.locator('.cert-name')).toHaveText(NAME);
      expect(nbsp(await planned.locator('.spec-sub').innerText())).toBe(L.sub);
      await expect(planned.locator('.cert-status')).toHaveText(L.status);
      await expect(planned.locator('a')).toHaveCount(0);
      // owner, photo-logos: old `svg` count 0. One decorative Claude mark, 20 x 20 attributes, no
      // <title>, no plate class (it needs none: 5.4:1 on the dark surface).
      const mark = planned.locator(
        'svg.cert-logo[data-icon="logos:claude-icon"][aria-hidden="true"]',
      );
      await expect(mark).toHaveCount(1);
      await expect(planned.locator('svg')).toHaveCount(1);
      await expect(mark).toHaveAttribute('width', '20');
      await expect(mark).toHaveAttribute('height', '20');
      await expect(mark.locator('title')).toHaveCount(0);
      await expect(mark).not.toHaveClass(/cert-logo--plate/);
      expect(await planned.innerText()).not.toMatch(/\bID\b|credential|verify|xác minh/i);
    });

    test('earned certifications keep their order and logos', async ({ page }) => {
      await page.goto(L.skills);
      const items = page.locator('#certifications [data-spec-items] > li');
      const subs = [
        nbsp(await items.nth(0).locator('.spec-sub').innerText()),
        nbsp(await items.nth(1).locator('.spec-sub').innerText()),
      ];
      expect(subs).toEqual(['Datadog · 2023', 'Amazon Web Services · 2022']);
      // owner, photo-logos: old count 2 (the earned certifications only); the planned row adds the
      // Claude mark, so 3 in all while each earned row still has exactly one.
      await expect(page.locator('#certifications svg.cert-logo')).toHaveCount(3);
      for (const i of [0, 1]) {
        await expect(items.nth(i)).not.toHaveAttribute('data-planned', /.*/);
        await expect(items.nth(i).locator('.cert-status')).toHaveCount(0);
        await expect(items.nth(i).locator('svg.cert-logo')).toHaveCount(1);
      }
    });

    for (const theme of ['light', 'dark'] as const) {
      test(`status reads distinct from the sub-line (${theme})`, async ({ page }) => {
        await gotoThemed(page, L.skills, theme);
        const planned = page.locator('#certifications [data-planned]');
        const [weight, statusColor, subColor] = await planned.evaluate((li) => {
          const s = getComputedStyle(li.querySelector('.cert-status')!);
          const sub = getComputedStyle(li.querySelector('.spec-sub')!);
          return [s.fontWeight, s.color, sub.color];
        });
        expect(weight).toBe('600');
        expect(statusColor).not.toBe(subColor);
      });

      test(`axe finds no violations in #certifications (${theme})`, async ({ page }) => {
        await gotoThemed(page, L.skills, theme);
        const { violations } = await new AxeBuilder({ page }).include('#certifications').analyze();
        expect(violations.map((v) => v.id)).toEqual([]);
      });
    }

    test('no horizontal scroll at 320', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 });
      await page.goto(L.skills);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(over).toBeLessThanOrEqual(0);
    });
  });

  test.describe(`Planned certification elsewhere ${L.exp}`, () => {
    // experiences-no-next: the 2 earned cards only; the planned cert is nowhere on /experiences/.
    test('is not a Certifications card on /experiences/ (the 2 earned only)', async ({ page }) => {
      await page.goto(L.exp);
      const cards = page.locator('#certifications .group-card');
      await expect(cards).toHaveCount(2);
      await expect(cards.locator('h3')).not.toHaveText([NAME, NAME]);
      await expect(page.locator('#certifications')).not.toContainText(NAME);
      await expect(page.locator('#next-cert')).toHaveCount(0);
      await expect(page.locator('main')).not.toContainText(NAME);
    });

    test('is on the CV print page as "Name (when)" with no link', async ({ page }) => {
      await page.goto(L.print);
      const li = page.locator('.certs li').filter({ hasText: NAME });
      await expect(li).toHaveCount(1);
      expect(nbsp(await li.innerText())).toBe(L.printText);
      await expect(li.locator('a')).toHaveCount(0);
      // Earned ones keep "Name (Year)".
      await expect(page.locator('.certs li').filter({ hasText: '(2023)' })).toHaveCount(1);
      await expect(page.locator('.certs li').filter({ hasText: '(2022)' })).toHaveCount(1);
    });
  });
}
