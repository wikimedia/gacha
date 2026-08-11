import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import esX from 'eslint-plugin-es-x';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/', 'data_pipeline/'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  // "essential" catches real bugs without imposing template style; ratchet
  // up to flat/recommended once the initial adoption dust settles.
  ...pluginVue.configs['flat/essential'],

  // Parse <script lang="ts"> blocks in SFCs with the TS parser.
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },

  {
    languageOptions: {
      globals: { ...globals.browser },
    },
  },
  {
    files: ['scripts/**', 'vite.config.*'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Browser-compat floor (WebKit is the binding constraint; iPhone 8/X top
  // out at iOS 16.7). Each rule names the first Safari that supports the
  // feature. Syntax rules are the critical ones: a single occurrence is a
  // parse-time error that takes down the whole bundle on older engines.
  // scripts/check-compat.mjs re-checks the built output, dependencies
  // included; this catches our own code at authoring time.
  {
    plugins: { 'es-x': esX },
    rules: {
      // Syntax (parse-time failure)
      'es-x/no-regexp-lookbehind-assertions': 'error', // Safari 16.4
      'es-x/no-class-static-block': 'error', // Safari 16.4
      'es-x/no-regexp-v-flag': 'error', // Safari 17
      'es-x/no-regexp-duplicate-named-capturing-groups': 'error', // Safari 17.4
      // APIs (runtime failure on the call site)
      'es-x/no-array-fromasync': 'error', // Safari 16.4
      'es-x/no-array-prototype-toreversed': 'error', // Safari 16
      'es-x/no-array-prototype-tosorted': 'error', // Safari 16
      'es-x/no-array-prototype-tospliced': 'error', // Safari 16
      'es-x/no-array-prototype-with': 'error', // Safari 16
      'es-x/no-object-groupby': 'error', // Safari 17.4
      'es-x/no-map-groupby': 'error', // Safari 17.4
      'es-x/no-promise-withresolvers': 'error', // Safari 17.4
    },
  },

  // Local accommodations, to keep adoption from forcing a rewrite.
  {
    rules: {
      // Supabase rows flow through as `any` by design (see mapArticleRowToCard).
      '@typescript-eslint/no-explicit-any': 'off',
      // Single-word view/component names are established here (Card, Stars, Loader).
      'vue/multi-word-component-names': 'off',
    },
  }
);
