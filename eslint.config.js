import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default [
  {
    ignores: [
      'dist',
      '.astro',
      'node_modules',
      '.lighthouseci',
      'playwright-report',
      'test-results',
      // Crew working notes and review helpers are not part of the site.
      '.crew',
      // Tests are not linted; they are still type-checked and formatted.
      'tests',
    ],
  },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
];
