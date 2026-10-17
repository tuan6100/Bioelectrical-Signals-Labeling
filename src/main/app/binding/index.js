import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import appConfig from "../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

function findNativeBinary() {
    const candidates = [
        path.resolve(__dirname, '../../../../build/Release/biosignal_native.node'),
        path.resolve(__dirname, '../../../build/Release/biosignal_native.node'),
        path.resolve(__dirname, '../native/bin/biosignal_native.node'),
        path.join(__dirname, 'bin', 'biosignal_native.node'),
    ];

    if (process.resourcesPath) {
        candidates.push(
            path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'main', 'app', 'native', 'bin', 'biosignal_native.node'),
            path.join(process.resourcesPath, 'app.asar.unpacked', 'build', 'Release', 'biosignal_native.node')
        );
    }

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return path.join(__dirname, 'bin', 'biosignal_native.node');
}

let nativeModule = null;
try {
    const binaryPath = findNativeBinary();
    nativeModule = require(binaryPath);
} catch (err) {
    console.error('Failed to load biosignal native module:', err);
}

export const isNativeAvailable = appConfig.get("native") && Boolean(nativeModule);

export function calculateCRC32(text) {
    if (nativeModule && nativeModule.calculateCRC32) {
        return nativeModule.calculateCRC32(text);
    }
    throw new Error('Native module not available for calculateCRC32');
}

export function parseNatusFile(filePath) {
    if (nativeModule && nativeModule.parseNatusFile) {
        return nativeModule.parseNatusFile(filePath);
    }
    throw new Error('Native module not available for parseNatusFile');
}

export function findNearestTimePoint(timeMs, timeSeries) {
    return nativeModule.findNearestTimePoint(timeMs, timeSeries);
}

export function generateTimeSeries(subsampledKhz, durationMs) {
    if (isNativeAvailable && nativeModule.generateTimeSeries) {
        return nativeModule.generateTimeSeries(subsampledKhz, durationMs);
    }
}

export function buildSignalPoints(rawSamples, freqHz, durationMs) {
    if (nativeModule && nativeModule.buildSignalPoints) {
        return nativeModule.buildSignalPoints(rawSamples, freqHz, durationMs);
    }
    throw new Error('Native module not available for buildSignalPoints');
}
