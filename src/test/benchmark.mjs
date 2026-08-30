import { performance } from 'node:perf_hooks';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import CRC32 from 'crc-32';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const native = require('../../build/Release/biosignal_native.node');

console.log('============================================');
console.log('   PERFORMANCE BENCHMARK: JS vs NATIVE C++  ');
console.log('============================================\n');

// 1. Generate large synthetic Natus data
const numChannels = 4;
const sweepsPerChannel = 10;
const samplesPerSweep = 1920; // total 76,800 samples

let fileContent = `; Viking v.22.1 - © 2021 Natus
[1 - Test Info]
Patient ID=BN-998822
First Name=Nguyen Thi Huong
Gender=Female
Test=EMG
Acquisition Start Time=09:15:30 SA
Acquisition End Time=09:20:45 SA
`;

for (let ch = 1; ch <= numChannels; ch++) {
    fileContent += `\n[1.${ch} - Channel ${ch}]
Channel number=${ch}
Sampling Frequency(kHz)=48,0
Subsampled(kHz)=19,2
Sweep Duration(ms)=100
`;
    for (let sw = 1; sw <= sweepsPerChannel; sw++) {
        fileContent += `\n[1.${ch}.${sw} - LongTrace Data]
Channel number=${ch}
LongTrace Data(µV)<1920>=`;
        const sampleRow = [];
        for (let s = 0; s < samplesPerSweep; s++) {
            sampleRow.push(((Math.sin(s * 0.1) * 50) + (Math.cos(s * 0.05) * 20)).toFixed(2));
        }
        fileContent += sampleRow.join(', ') + '\n';
    }
}

const tempPath = path.join(os.tmpdir(), `bench_natus_${Date.now()}.txt`);
const buf = Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(fileContent, 'utf16le')]);
fs.writeFileSync(tempPath, buf);
console.log(`Generated benchmark file: ${(buf.length / 1024 / 1024).toFixed(2)} MB (${numChannels * sweepsPerChannel * samplesPerSweep} total samples)\n`);

try {
    // --- BENCHMARK 1: CRC32 ---
    console.log('--- 1. CRC32 Hashing Benchmark ---');
    const crcIters = 50;
    const t0JsCrc = performance.now();
    for (let i = 0; i < crcIters; i++) {
        CRC32.str(fileContent);
    }
    const tJsCrc = performance.now() - t0JsCrc;

    const t0NativeCrc = performance.now();
    for (let i = 0; i < crcIters; i++) {
        native.calculateCRC32(fileContent);
    }
    const tNativeCrc = performance.now() - t0NativeCrc;

    console.log(`   JavaScript CRC32:   ${tJsCrc.toFixed(2)} ms (${(tJsCrc / crcIters).toFixed(2)} ms/run)`);
    console.log(`   Native C++ CRC32:   ${tNativeCrc.toFixed(2)} ms (${(tNativeCrc / crcIters).toFixed(2)} ms/run)`);
    console.log(`   Speedup:            ${(tJsCrc / tNativeCrc).toFixed(1)}x faster!\n`);

    // --- BENCHMARK 2: File Parse & Channel Extraction ---
    console.log('--- 2. File Parsing & Extraction Benchmark ---');
    const parseIters = 10;

    // JavaScript parsing logic
    const t0JsParse = performance.now();
    for (let i = 0; i < parseIters; i++) {
        let text = fs.readFileSync(tempPath, 'utf16le');
        text = text.replace(/\r\n|\r|\n/g, '\n').replace(/\/\r?\n/g, ',');
        const lines = text.split('\n');
        const result = {};
        let cur = null;
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith(';') || line.startsWith('...')) continue;
            const sec = line.match(/^\[([\d.]+)\s*-\s*([^\]]+)]/);
            if (sec) {
                const parts = sec[1].split('.');
                let o = result;
                for (const p of parts) { if (!o[p]) o[p] = {}; o = o[p]; }
                if (!o[sec[2]]) o[sec[2]] = {};
                cur = o[sec[2]];
                continue;
            }
            const eq = line.indexOf('=');
            if (eq !== -1 && cur) {
                cur[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
            }
        }
        // Extract samples
        const channels = [];
        for (let ch = 1; ch <= numChannels; ch++) {
            const allSamples = [];
            for (let sw = 1; sw <= sweepsPerChannel; sw++) {
                const sec = result['1']?.[String(ch)]?.[String(sw)]?.['LongTrace Data'];
                if (sec) {
                    for (const k of Object.keys(sec)) {
                        if (k.includes('LongTrace Data')) {
                            const raw = sec[k];
                            const parsedSamples = raw.split(',').map(v => parseFloat(v.trim()));
                            for (let p = 0; p < parsedSamples.length; p++) {
                                allSamples.push(parsedSamples[p]);
                            }
                        }
                    }
                }
            }
            channels.push({ ch, json: JSON.stringify(allSamples) });
        }
    }
    const tJsParse = performance.now() - t0JsParse;

    // Native C++ parsing
    const t0NativeParse = performance.now();
    let nativeRes = null;
    for (let i = 0; i < parseIters; i++) {
        nativeRes = native.parseNatusFile(tempPath);
    }
    const tNativeParse = performance.now() - t0NativeParse;

    console.log(`   JavaScript Parser:  ${tJsParse.toFixed(2)} ms (${(tJsParse / parseIters).toFixed(2)} ms/run)`);
    console.log(`   Native C++ Parser:  ${tNativeParse.toFixed(2)} ms (${(tNativeParse / parseIters).toFixed(2)} ms/run)`);
    console.log(`   Speedup:            ${(tJsParse / tNativeParse).toFixed(1)}x faster!\n`);

    // --- BENCHMARK 3: Signal Points Rendering Generation ---
    console.log('--- 3. Signal Points Generation Benchmark ---');
    const sampleChannel = nativeRes.channels[0];
    const rawJson = sampleChannel.rawSamplesJson;
    const ptsIters = 20;

    const t0JsPts = performance.now();
    for (let i = 0; i < ptsIters; i++) {
        const arr = JSON.parse(rawJson);
        const dtMs = 1000 / 19200;
        const res = arr.map((v, idx) => ({ time: +(idx * dtMs).toFixed(3), value: -v }));
    }
    const tJsPts = performance.now() - t0JsPts;

    const t0NativePts = performance.now();
    for (let i = 0; i < ptsIters; i++) {
        native.buildSignalPoints(rawJson, 19200, sampleChannel.durationMs);
    }
    const tNativePts = performance.now() - t0NativePts;

    console.log(`   JavaScript Points:  ${tJsPts.toFixed(2)} ms (${(tJsPts / ptsIters).toFixed(2)} ms/run)`);
    console.log(`   Native C++ Points:  ${tNativePts.toFixed(2)} ms (${(tNativePts / ptsIters).toFixed(2)} ms/run)`);
    console.log(`   Speedup:            ${(tJsPts / tNativePts).toFixed(1)}x faster!\n`);

    console.log('============================================');
    console.log('           BENCHMARK COMPLETE               ');
    console.log('============================================');
} finally {
    fs.unlinkSync(tempPath);
}
