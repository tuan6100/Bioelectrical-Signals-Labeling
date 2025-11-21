import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/main/app/preload.js',
            name: 'preload',
            formats: ['cjs'],
            fileName: () => 'preload.js',
        },
        target: 'node18',
        sourcemap: false,
        minify: false,
        rollupOptions: {
            output: {
                entryFileNames: 'preload.js'
            }
        }
    },
});
