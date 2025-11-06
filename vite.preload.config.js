import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/main/app/preload.js',
            formats: ['cjs'],
            fileName: () => 'preload.cjs',
        }
    },
});
