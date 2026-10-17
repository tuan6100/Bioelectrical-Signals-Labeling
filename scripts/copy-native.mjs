import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve('build/Release/biosignal_native.node');
const targets = [
    path.resolve('src/main/app/native/bin'),
    path.resolve('src/main/app/binding/bin')
];

if (!fs.existsSync(src)) {
    console.error(`Build artifact not found: ${src}`);
    process.exit(1);
}

for (const destDir of targets) {
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, 'biosignal_native.node');
    fs.copyFileSync(src, dest);
    console.log(`Copied native addon from ${src} to ${dest}`);
}
