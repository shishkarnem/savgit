import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.d.ts', '*.cjs', 'build_glbs.cjs']
  }
];
