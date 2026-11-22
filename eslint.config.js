import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * The purity guard (ADR 0001, AGENTS.md): the sim core has no clock, no randomness outside its seeded
 * RNG, no I/O, no DOM and no three.js. This catches the loud violations; review catches the quiet ones
 * (unordered iteration feeding a decision, sorts without a total comparator).
 */
const pure = 'The sim core is pure (ADR 0001).';
const impureGlobals = ['Date', 'fetch', 'crypto', 'process', 'window', 'document', 'performance', 'localStorage', 'requestAnimationFrame'].map(
  (name) => ({ name, message: `${pure} No ${name}.` }),
);
const impureProperties = [{ object: 'Math', property: 'random', message: `${pure} Use the seeded RNG in the state.` }];

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts', 'scripts/**', 'reports/**', 'coverage/**', '.stryker-tmp/**', '.agents/**', '.claude/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['packages/sim/src/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...impureGlobals],
      'no-restricted-properties': ['error', ...impureProperties],
      'no-restricted-imports': ['error', { patterns: [{ group: ['three', 'three/*', '@asteroid/web'], message: `${pure} No renderer imports.` }] }],
      complexity: ['warn', 12],
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, skipComments: true }],
      'max-params': ['warn', 5],
    },
  },
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs', 'vitest.config.ts', 'packages/web/vite.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },
);
