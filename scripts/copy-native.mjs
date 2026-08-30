import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve('build/Release/biosignal_native.node');
const destDir = path.resolve('src/main/app/native/bin');
const dest = path.join(destDir, 'biosignal_native.node');

if (!fs.existsSync(src)) {
    console.error(`Build artifact not found: ${src}`);
    process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
console.log(`Copied native addon from ${src} to ${dest}`);
