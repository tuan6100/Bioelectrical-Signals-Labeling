import { defineConfig } from 'vite';
import react from "@vitejs/plugin-react";
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@biosignal/app': path.resolve(process.cwd(), 'src/main/app'),
            '@biosignal/common': path.resolve(process.cwd(), 'src/main/common'),
            '@biosignal/web': path.resolve(process.cwd(), 'src/main/web')
        }
    },
    build: {
        target: 'node18',
        lib: {
            entry: 'src/main/app/main.js',
            name: 'main',
            formats: ['es'],
            fileName: () => 'main.js',
        },
        rollupOptions: {
            external: ['react', 'react-dom', 'better-sqlite3'],
        },
    },
});