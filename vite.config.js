import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import analyze from 'rollup-plugin-analyzer'

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'happy-dom',
        setupFiles: ['./setup-test-env.ts'],
    },
    build: {
        rollupOptions: {
            plugins: [analyze()],
        },
    },
})
