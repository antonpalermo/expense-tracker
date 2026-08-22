import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
    globalIgnores(['dist', '.wrangler', 'worker-configuration.d.ts']),
    {
        files: ['**/*.{ts,tsx}'],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite
        ],
        languageOptions: {
            globals: globals.browser
        }
    },
    {
        // TanStack Router file routes export a `Route` object and keep their
        // component local — that is the framework's contract, so the
        // fast-refresh heuristic does not apply to them.
        files: ['app/routes/**/*.tsx'],
        rules: {
            'react-refresh/only-export-components': 'off'
        }
    },
    {
        // shadcn primitives are generated, and co-export their cva variant
        // helpers alongside the component by convention.
        files: ['app/components/ui/**/*.tsx'],
        rules: {
            'react-refresh/only-export-components': 'off'
        }
    }
])
