import { defineConfig } from 'vite';
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config
export default defineConfig({
    plugins: [react()],
    build: {
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