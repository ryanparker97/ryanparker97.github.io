import { expect, test } from '@playwright/test';

// Skills page (spec §4.8): Tech Specs rows for skill groups, certifications and languages.
test.use({ reducedMotion: 'reduce' });

// null = no real brand mark: no icon, an empty aria-hidden slot keeps the names aligned.
const TOOL_IDS: (string | null)[] = [
  'logos:python',
  null,
  'apache-spark',
  'apache-spark',
  'logos:airflow-icon',
  'logos:dbt-icon',
  'logos:databricks-icon',
  'talend',
  null,
  null,
  null,
  null,
  null,
  null,
  'logos:aws',
  'logos:microsoft-azure',
  'logos:git-icon',
  'logos:gitlab-icon',
  null,
  'logos:docker-icon',
  'logos:kubernetes',
  'logos:datadog-icon',
  null,
  null,
  null,
  'logos:java',
  null,
  null,
  'logos:postgresql',
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];
const CHILD_IDS: (string | null)[] = [
  null, // EMR (no brand icon installed)
  'logos:aws-s3',
  'logos:aws-athena',
  'logos:aws-redshift',
  'logos:aws-lake-formation',
  'logos:databricks-icon',
  'logos:aws-cloudformation',
  null, // CDK (no brand icon installed)
  'logos:terraform-icon',
  'logos:spring-icon',
];
const CHILD_NAMES = [
  'EMR',
  'S3',
  'Athena',
  'Redshift',
  'Lake Formation',
  'Databricks',
  'CloudFormation',
  'CDK',
  'Terraform',
  'Spring Boot',
];
const EXPECTED_PLAIN_ROWS = 9; // AI Engineering (6) + Methodologies (3)
const ROWS = '[data-spec-row]:not(#certifications):not(#languages) [data-spec-items] > li';

test.describe('Skills page', () => {
  test('structure: one H1, local nav title, one H2 per row', async ({ page }) => {
    await page.goto('/skills/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveText('The tools I build with.');
    await expect(page.locator('[data-local-nav] .title').first()).toContainText('Skills');
    await expect(page.locator('main h2')).toHaveText([
      'Data Engineering',
      'Cloud Platform',
      'DevOps & IaC',
      'Backend Engineering',
      'AI Engineering',
      'Methodologies',
      'Certifications',
      'Languages',
    ]);
  });

  test('items, certifications and languages', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/skills/');
    await expect(page.locator('[data-spec-items]').first()).toBeVisible();
    await expect(page.locator('main')).toContainText('Lake Formation');
    expect(
      await page
        .locator('.spec-item')
        .first()
        .evaluate((e) => getComputedStyle(e).fontSize),
    ).toBe('17px');
    await expect(page.locator('#certifications')).toContainText('Amazon Web Services · 2022');
    await expect(page.locator('#certifications')).toContainText('Datadog · 2023');
    await expect(page.locator('#languages')).toContainText('Professional working proficiency');
  });

  for (const path of ['/skills/', '/vi/skills/']) {
    test(`brand rows have one logo, other rows none, no chips: ${path}`, async ({ page }) => {
      await page.goto(path);
      const rows = page.locator(ROWS);
      await expect(rows).toHaveCount(39);
      const all = await rows.all();
      expect(all).toHaveLength(TOOL_IDS.length);
      for (const [i, row] of all.entries()) {
        const icon = row.locator('.tool-name > svg.tool-icon');
        if (TOOL_IDS[i] === null) {
          await expect(icon).toHaveCount(0);
          // an empty aria-hidden slot only in a band that has some logos; none in an all-blank band
          const mixed = await row.evaluate(
            (e) => !!e.closest('[data-spec-row]')!.querySelector('.tool-name > svg.tool-icon'),
          );
          await expect(row.locator('.tool-name > .tool-slot[aria-hidden="true"]')).toHaveCount(
            mixed ? 1 : 0,
          );
          continue;
        }
        await expect(icon).toHaveCount(1);
        await expect(icon).toHaveAttribute('data-icon', TOOL_IDS[i]!);
        await expect(icon).toHaveAttribute('aria-hidden', 'true');
        await expect(icon).toHaveAttribute('width', '20');
        await expect(icon).toHaveAttribute('height', '20');
        await expect(icon.locator('title')).toHaveCount(0);
      }
      const ids = await rows
        .locator('.tool-name')
        .evaluateAll((l) =>
          l.map(
            (e) => e.querySelector(':scope > svg.tool-icon')?.getAttribute('data-icon') ?? null,
          ),
        );
      expect(ids).toEqual(TOOL_IDS);
      expect(ids.filter(Boolean)).toHaveLength(16);
      expect(ids.filter((x) => x?.startsWith('lucide'))).toHaveLength(0);
      // names are aligned within each band; all-blank bands have no slot, so they sit flush
      const xs = await rows.locator('.tool-name').evaluateAll((l) =>
        l.map((e) => {
          const n = [...e.childNodes].find((c) => c.nodeType === 3 && c.textContent?.trim());
          const r = document.createRange();
          r.selectNodeContents(n!);
          return [
            e.closest('[data-spec-row]')!.id,
            Math.round(r.getBoundingClientRect().x - e.getBoundingClientRect().x),
          ] as [string, number];
        }),
      );
      const perBand = new Map<string, Set<number>>();
      for (const [id, x] of xs) perBand.set(id, (perBand.get(id) ?? new Set()).add(x));
      expect(perBand.size).toBe(6);
      for (const [id, set] of perBand) expect(set.size, id).toBe(1);
      // mixed bands (they render a slot) all share one name x; plain bands sit flush (x = 0)
      const plainIds = await page
        .locator('[data-spec-row]:has(ul.spec-items--plain)')
        .evaluateAll((l) => l.map((e) => e.id));
      expect(plainIds).toHaveLength(2);
      const mixedXs = new Set<number>();
      for (const [id, set] of perBand) {
        if (plainIds.includes(id)) expect([...set], id).toEqual([0]);
        else for (const x of set) mixedXs.add(x);
      }
      expect(mixedXs.size, 'one name x across all mixed bands').toBe(1);
      await expect(page.locator('ul.spec-items--plain')).toHaveCount(2);
      await expect(page.locator('ul.spec-items--plain .tool-slot')).toHaveCount(0);
      await expect(page.locator('ul.spec-items--plain .tool-name')).toHaveCount(
        EXPECTED_PLAIN_ROWS,
      );
      // mixed bands keep the slot: 14 no-logo rows (7 data, 4 devops, 3 backend)
      await expect(page.locator('.tool-name > .tool-slot')).toHaveCount(14);
      await expect(
        page.locator('.spec-sheet svg:not(.chev):not(.cert-logo):not(.tool-icon)'),
      ).toHaveCount(0);
      await expect(page.locator('.spec-sheet .chip')).toHaveCount(0);
      await expect(page.locator('.spec-sheet img')).toHaveCount(0);
      const names = await rows.locator('.spec-item').allTextContents();
      expect(names).toHaveLength(39);
      expect(names[0].trim()).toBe('Python');
      expect(names[38].trim()).toBe('Cross-Functional Collaboration');
    });
  }

  for (const path of ['/skills/', '/vi/skills/']) {
    test(`brand sub-items have one small logo, others none: ${path}`, async ({ page }) => {
      await page.goto(path);
      const kids = page.locator('.spec-children > li.spec-child');
      await expect(kids).toHaveCount(10);
      expect((await kids.allTextContents()).map((x) => x.trim())).toEqual(CHILD_NAMES);
      for (const [i, kid] of (await kids.all()).entries()) {
        const icon = kid.locator('svg');
        if (CHILD_IDS[i] === null) {
          await expect(icon).toHaveCount(0);
          await expect(kid.locator('.tool-slot--child[aria-hidden="true"]')).toHaveCount(1);
          continue;
        }
        await expect(icon).toHaveCount(1);
        await expect(icon).toHaveClass(/tool-icon--child/);
        await expect(icon).toHaveAttribute('aria-hidden', 'true');
        await expect(icon).toHaveAttribute('width', '16');
        await expect(icon).toHaveAttribute('height', '16');
        await expect(icon.locator('title')).toHaveCount(0);
        // 16px mark in a 20px slot: smaller than the 20px-in-24px row icon
        const box = await icon.boundingBox();
        expect(box!.width).toBeCloseTo(20, 0);
        expect(box!.height).toBeCloseTo(20, 0);
      }
      const kidIds = await kids.evaluateAll((l) =>
        l.map((e) => e.querySelector(':scope > svg')?.getAttribute('data-icon') ?? null),
      );
      expect(kidIds).toEqual(CHILD_IDS);
      expect(kidIds.filter(Boolean)).toHaveLength(8);
      expect(kidIds.filter((x) => x?.startsWith('lucide'))).toHaveLength(0);
      // the row icons stay 20px and are not counted as children
      await expect(page.locator('.tool-name > svg.tool-icon')).toHaveCount(16);
      // no Lucide glyph anywhere on the page
      await expect(page.locator('.spec-sheet [data-icon^="lucide"]')).toHaveCount(0);
    });
  }

  test('logos note shows once under the list, EN and VI', async ({ page }) => {
    await page.goto('/skills/');
    await expect(page.locator('.spec-note')).toHaveCount(1);
    await expect(page.locator('.spec-note')).toHaveText(
      'Names and logos belong to their owners; no endorsement implied.',
    );
    await page.goto('/vi/skills/');
    await expect(page.locator('.spec-note')).toHaveCount(1);
    await expect(page.locator('.spec-note')).toHaveText(
      'Tên và logo thuộc về chủ sở hữu tương ứng; không hàm ý sự bảo trợ hay xác nhận.',
    );
  });

  test('tool names are identical in EN and VI', async ({ page }) => {
    const names = async (path: string) => {
      await page.goto(path);
      return (await page.locator(ROWS).locator('.spec-item').allTextContents()).map((x) =>
        x.trim(),
      );
    };
    expect(await names('/vi/skills/')).toEqual(await names('/skills/'));
  });

  test('dark theme puts low-contrast marks on a plate', async ({ page }) => {
    const bgs = async (theme: 'light' | 'dark') => {
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      await page.goto('/skills/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      return page
        .locator('svg.tool-icon')
        .evaluateAll((l) =>
          l.map((e) => [
            e.getAttribute('data-icon'),
            getComputedStyle(e).backgroundColor,
            e.classList.contains('tool-icon--plate'),
          ]),
        );
    };
    const dark = await bgs('dark');
    const plated = dark.filter((r) => r[2]);
    expect(plated).toHaveLength(12); // 6 row marks + 6 sub-item marks
    for (const r of plated) expect(r[1]).toBe('rgb(255, 255, 255)');
    for (const r of dark.filter((x) => !x[2])) expect(r[1]).toBe('rgba(0, 0, 0, 0)');
    expect(dark.find((r) => r[0] === 'logos:docker-icon')![1]).toBe('rgba(0, 0, 0, 0)');
  });

  for (const path of ['/skills/', '/vi/skills/']) {
    test(`certification logos are plated in dark only: ${path}`, async ({ page }) => {
      const certs = async (theme: 'light' | 'dark') => {
        await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
        await page.goto(path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        return page
          .locator('#certifications svg.cert-logo')
          .evaluateAll((l) =>
            l.map((e) => [
              e.getAttribute('data-icon'),
              getComputedStyle(e).backgroundColor,
              Math.round(e.getBoundingClientRect().width),
              e.classList.contains('cert-logo--plate'),
            ]),
          );
      };
      const dark = await certs('dark');
      // owner, photo-logos: the planned certification shows the Claude mark too (old: two marks,
      // aws + datadog, all on a white plate). The Claude mark is 5.4:1 on the dark surface, so it
      // takes no plate (tool-icons.ts iconPlate); the two earned marks keep theirs.
      expect(dark.map((r) => r[0]).sort()).toEqual([
        'logos:aws',
        'logos:claude-icon',
        'logos:datadog-icon',
      ]);
      for (const r of dark) {
        expect(r[3], String(r[0])).toBe(r[0] !== 'logos:claude-icon');
        expect(r[1], String(r[0])).toBe(r[3] ? 'rgb(255, 255, 255)' : 'rgba(0, 0, 0, 0)');
      }
      const light = await certs('light');
      for (const r of light) expect(r[1], String(r[0])).toBe('rgba(0, 0, 0, 0)');
      // same box in both themes: no layout shift
      expect(light.map((r) => r[2])).toEqual(dark.map((r) => r[2]));
    });

    test(`system theme with OS dark plates the same marks: ${path}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: 'dark', reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.addInitScript(() => localStorage.setItem('theme', 'system'));
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('data-pref', 'system');
      const rows = await page
        .locator('svg.tool-icon')
        .evaluateAll((l) =>
          l.map((e) => [
            e.classList.contains('tool-icon--plate'),
            getComputedStyle(e).backgroundColor,
          ]),
        );
      expect(rows.filter((r) => r[0])).toHaveLength(12);
      for (const [plate, bg] of rows)
        expect(bg).toBe(plate ? 'rgb(255, 255, 255)' : 'rgba(0, 0, 0, 0)');
      const certs = await page
        .locator('#certifications svg.cert-logo')
        .evaluateAll((l) => l.map((e) => getComputedStyle(e).backgroundColor));
      // owner, photo-logos: old [white, white]; the Claude mark (planned row, last) takes no plate.
      expect(certs).toEqual(['rgb(255, 255, 255)', 'rgb(255, 255, 255)', 'rgba(0, 0, 0, 0)']);
      await ctx.close();
    });
  }

  test('light theme has no plates; Talend keeps its colour', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('theme', 'light'));
    await page.goto('/skills/');
    const bgs = await page
      .locator('svg.tool-icon')
      .evaluateAll((l) => l.map((e) => getComputedStyle(e).backgroundColor));
    for (const b of bgs) expect(b).toBe('rgba(0, 0, 0, 0)');
    const fill = await page.locator('[id="ai:local:talend"] path').first().getAttribute('fill');
    expect(fill).toMatch(/ff6d70/i);
  });

  for (const path of ['/skills/', '/vi/skills/']) {
    for (const width of [390, 320]) {
      test(`no horizontal scroll at ${width}: ${path}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(path);
        const over = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(over).toBeLessThanOrEqual(0);
      });
    }
  }

  test('two columns at 1440, stacked at 375, with hairlines', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/skills/');
    const row = page.locator('[data-spec-row]').first();
    const box = async () => ({
      name: (await row.locator('.spec-name').boundingBox())!,
      body: (await row.locator('.spec-body').boundingBox())!,
    });
    let b = await box();
    expect(b.name.x).toBeLessThan(b.body.x);
    expect(Math.abs(b.name.y - b.body.y)).toBeLessThanOrEqual(2);
    expect(await row.evaluate((e) => getComputedStyle(e).borderTopWidth)).toBe('1px');
    await page.setViewportSize({ width: 375, height: 812 });
    b = await box();
    expect(Math.abs(b.name.x - b.body.x)).toBeLessThanOrEqual(1);
  });

  test('peek: the band starts above the fold', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/skills/');
    const top = async () => (await page.locator('main > .section').first().boundingBox())!.y;
    expect(await top()).toBeLessThanOrEqual(836);
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await top()).toBeLessThanOrEqual(748);
  });

  test('Vietnamese', async ({ page }) => {
    await page.goto('/vi/skills/');
    await expect(page.locator('h1')).toHaveText('Những công cụ tôi dùng để xây dựng.');
    await expect(page.locator('main h2').first()).toHaveText('Kỹ thuật dữ liệu');
  });

  // Named change (home-alt-6, Wall): Home's main no longer has a keyboard link to Skills (the mock
  // has no Skills tile). The footer links it, and one wall tile (a pointer link) opens it.
  test('linked from the footer on Home and from one wall tile', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [path, name, href] of [
      ['/', 'Skills', '/skills/'],
      ['/vi/', 'Kỹ năng', '/vi/skills/'],
    ] as const) {
      await page.goto(path);
      await expect(page.locator('footer').getByRole('link', { name }), path).toHaveAttribute(
        'href',
        href,
      );
      await expect(page.locator('.w-clip a[href$="/skills/"]'), path).toHaveCount(1);
      await expect(page.locator('.w-clip a[href$="/skills/"]'), path).toHaveAttribute('href', href);
      await expect(page.locator('[data-local-nav]'), path).toHaveCount(0);
    }
  });
});
