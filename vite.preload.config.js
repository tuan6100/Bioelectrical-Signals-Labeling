import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: 'src/main/app/preload.js',
            name: 'preload',
            formats: ['es'],
            fileName: () => 'preload.js',
        }
    },
});
