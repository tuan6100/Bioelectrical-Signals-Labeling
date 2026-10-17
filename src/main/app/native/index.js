import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

function findNativeBinary() {
    const candidates = [
        path.join(__dirname, 'bin', 'biosignal_native.node'),
        path.resolve(__dirname, '../../../../build/Release/biosignal_native.node'),
        path.resolve(__dirname, '../../../build/Release/biosignal_native.node'),
    ];

    if (process.resourcesPath) {
        candidates.push(
            path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'main', 'app', 'native', 'bin', 'biosignal_native.node'),
            path.join(process.resourcesPath, 'app.asar.unpacked', 'build', 'Release', 'biosignal_native.node')
        );
    }

    for (const cand of candidates) {
        if (fs.existsSync(cand)) {
            return cand;
        }
    }
    // Default fallback to bin
    return path.join(__dirname, 'bin', 'biosignal_native.node');
}

let nativeModule = null;
try {
    const binaryPath = findNativeBinary();
    nativeModule = require(binaryPath);
} catch (err) {
    console.error('Failed to load biosignal native module:', err);
}

export const isNativeAvailable = Boolean(nativeModule);

export function calculateCRC32(text) {
    if (nativeModule && nativeModule.calculateCRC32) {
        return nativeModule.calculateCRC32(text);
    }
    throw new Error('Native module not available for calculateCRC32');
}

export function isNatusSignature(text) {
    if (nativeModule && nativeModule.isNatusSignature) {
        return nativeModule.isNatusSignature(text);
    }
    // Fallback regex
    const firstLines = text.split(/\r?\n/).slice(0, 5).join('\n');
    return /Viking v\.\d+(?:\.\d+)* - © \d{4} Natus/i.test(firstLines);
}

export function parseNatusText(text, fileName = '') {
    if (nativeModule && nativeModule.parseNatusText) {
        return nativeModule.parseNatusText(text, fileName);
    }
    throw new Error('Native module not available for parseNatusText');
}

export function parseNatusFile(filePath) {
    if (nativeModule && nativeModule.parseNatusFile) {
        return nativeModule.parseNatusFile(filePath);
    }
    throw new Error('Native module not available for parseNatusFile');
}

export function findNearestTimePoint(timeMs, timeSeries) {
    if (nativeModule && nativeModule.findNearestTimePoint) {
        return nativeModule.findNearestTimePoint(timeMs, timeSeries);
    }
    // Fallback
    if (!timeSeries || timeSeries.length === 0) return null;
    let left = 0;
    let right = timeSeries.length - 1;
    while (left < right) {
        const mid = Math.floor((left + right) / 2);
        if (timeSeries[mid] < timeMs) left = mid + 1;
        else right = mid;
    }
    let res = left > 0 ? (Math.abs(timeSeries[left - 1] - timeMs) <= Math.abs(timeSeries[left] - timeMs) ? timeSeries[left - 1] : timeSeries[left]) : timeSeries[left];
    return parseFloat(res.toFixed(3));
}

export function generateTimeSeries(subsampledKhz, durationMs) {
    if (nativeModule && nativeModule.generateTimeSeries) {
        return nativeModule.generateTimeSeries(subsampledKhz, durationMs);
    }
    const rateHz = subsampledKhz * 1000;
    const intervalMs = 1000 / rateHz;
    const ts = [];
    let cur = 0;
    while (cur <= durationMs) {
        ts.push(parseFloat(cur.toFixed(3)));
        cur += intervalMs;
    }
    return ts;
}

export function buildSignalPoints(rawSamples, freqHz, durationMs) {
    if (nativeModule && nativeModule.buildSignalPoints) {
        return nativeModule.buildSignalPoints(rawSamples, freqHz, durationMs);
    }
    throw new Error('Native module not available for buildSignalPoints');
}

export default nativeModule;
