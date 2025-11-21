import { defineConfig } from 'vite';
import react from "@vitejs/plugin-react";
import path from 'path';

// https://vitejs.dev/config
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@biosignal/app': path.resolve(process.cwd(), 'src/main/app'),
            '@biosignal/common': path.resolve(process.cwd(), 'src/main/common'),
            '@biosignal/web': path.resolve(process.cwd(), 'src/main/web')
        }
    }
});
