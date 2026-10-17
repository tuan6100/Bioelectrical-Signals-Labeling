import { expect } from 'chai';
import sinon from 'sinon';
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
const native = require('../../build/Release/biosignal_native.node');

describe('native addon integration', function () {
    this.timeout(5000);
    let consoleLogSpy;

    before(() => {
        consoleLogSpy = sinon.spy(console, 'log');
    });

    after(() => {
        if (consoleLogSpy && consoleLogSpy.restore) consoleLogSpy.restore();
    });

    it('calculates CRC32 correctly', () => {
        const testCrcStr = 'hello world';
        const crcResult = native.calculateCRC32(testCrcStr);
        expect(crcResult).to.equal('0d4a1185', 'CRC32 must match standard 0d4a1185');
    });

    it('finds nearest time point', () => {
        const timeSeries = [0.0, 0.052, 0.104, 0.156, 0.208, 0.260];
        const nearest = native.findNearestTimePoint(0.12, timeSeries);
        expect(nearest).to.equal(0.104);
    });

    it('generates a non-empty time series', () => {
        const generatedTs = native.generateTimeSeries(19.2, 1.0);
        expect(generatedTs).to.have.property('length').that.is.a('number').and.is.greaterThan(0);
    });

    it('parses Natus text and extracts channel data', () => {
        const mockNatusText = `
; Viking v.22.1 - © 2021 Natus
[1 - Test Info]
Patient ID=PID-999
First Name=Nguyen Van A
Gender=Male
Test=EMG
Acquisition Start Time=08:30:00 SA
Acquisition End Time=08:35:00 SA

[1.1 - Channel 1]
Channel number=1
Sampling Frequency(kHz)=48,0
Subsampled(kHz)=19,2
Sweep Duration(ms)=100

[1.1.1 - LongTrace Data]
Channel number=1
LongTrace Data(µV)<1920>=10.5, 20.25, -30.75, 40.0/
50.5, -60.25
`;

        const parsed = native.parseNatusText(mockNatusText, 'mock.txt');
        expect(parsed).to.be.an('object');
        expect(parsed.isNatus).to.be.true;
        expect(parsed.channels).to.be.an('array').that.is.not.empty;

        const ch = parsed.channels[0];
        expect(ch.samples.length).to.equal(6);
        expect(ch.samples[0]).to.equal(10.5);
        expect(ch.samples[5]).to.equal(-60.25);
    });

    it('parses Natus file (utf-16le with BOM)', async () => {
        const mockNatusText = `
; Viking v.22.1 - © 2021 Natus
[1 - Test Info]
Patient ID=PID-999
First Name=Nguyen Van A
Gender=Male
Test=EMG
Acquisition Start Time=08:30:00 SA
Acquisition End Time=08:35:00 SA

[1.1 - Channel 1]
Channel number=1
Sampling Frequency(kHz)=48,0
Subsampled(kHz)=19,2
Sweep Duration(ms)=100

[1.1.1 - LongTrace Data]
Channel number=1
LongTrace Data(µV)<1920>=10.5, 20.25, -30.75, 40.0/
50.5, -60.25
`;

        const tempDir = join(tmpdir(), `biosignal_unicode_${Date.now()}_测试_á`);
        const tempFile = join(tempDir, `test_natus_${Date.now()}.txt`);
        const buf = Buffer.from(mockNatusText, 'utf16le');
        const bomBuf = Buffer.concat([Buffer.from([0xFF, 0xFE]), buf]);
        mkdirSync(tempDir, { recursive: true });
        writeFileSync(tempFile, bomBuf);
        try {
            const fileParsed = native.parseNatusFile(tempFile);
            expect(fileParsed.channels.length).to.equal(1);
            expect(fileParsed.channels[0].samples.length).to.equal(6);
        } finally {
            rmSync(tempDir, { recursive: true, force: true });
        }
    });
});

