import assert from 'node:assert';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const native = require('../../build/Release/biosignal_native.node');

console.log('1. Testing CRC32:');
const testCrcStr = 'hello world';
const crcResult = native.calculateCRC32(testCrcStr);
console.log(`   CRC32("${testCrcStr}") =`, crcResult);
assert.strictEqual(crcResult, '0d4a1185', 'CRC32 must match standard 0d4a1185');

console.log('2. Testing Natus signature:');
const sampleSig = '; Viking v.22.1 - © 2021 Natus\n[1 - Test]\n';
assert.strictEqual(native.isNatusSignature(sampleSig), true);
assert.strictEqual(native.isNatusSignature('Random invalid text'), false);
console.log('   Natus signature validation passed.');

console.log('3. Testing findNearestTimePoint:');
const timeSeries = [0.0, 0.052, 0.104, 0.156, 0.208, 0.260];
const nearest = native.findNearestTimePoint(0.12, timeSeries);
console.log('   findNearestTimePoint(0.12, ...) =', nearest);
assert.strictEqual(nearest, 0.104);

console.log('4. Testing generateTimeSeries:');
const generatedTs = native.generateTimeSeries(19.2, 1.0);
console.log('   generateTimeSeries(19.2, 1.0) count =', generatedTs.length, 'sample =', Array.from(generatedTs.slice(0, 5)));
assert(generatedTs.length > 0);

console.log('5. Testing parseNatusText:');
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
console.log('   Parsed isNatus:', parsed.isNatus);
console.log('   Parsed contentHash:', parsed.contentHash);
console.log('   Parsed metadata:', parsed.metadata);
console.log('   Parsed channel count:', parsed.channels.length);
if (parsed.channels.length > 0) {
    const ch = parsed.channels[0];
    console.log('   Channel 1 dataType:', ch.dataType);
    console.log('   Channel 1 channelNumber:', ch.channelNumber);
    console.log('   Channel 1 sample count:', ch.samples.length);
    console.log('   Channel 1 samples:', Array.from(ch.samples));
    console.log('   Channel 1 rawSamplesJson:', ch.rawSamplesJson);
    console.log('   Channel 1 durationMs:', ch.durationMs);
    assert.strictEqual(ch.samples.length, 6);
    assert.strictEqual(ch.samples[0], 10.5);
    assert.strictEqual(ch.samples[5], -60.25);
}

console.log('7. Testing parseNatusFile:');
import('node:fs').then(({ writeFileSync, unlinkSync }) => {
    import('node:path').then(({ join }) => {
        import('node:os').then(({ tmpdir }) => {
            const tempFile = join(tmpdir(), `test_natus_${Date.now()}.txt`);
            const buf = Buffer.from(mockNatusText, 'utf16le');
            const bomBuf = Buffer.concat([Buffer.from([0xFF, 0xFE]), buf]);
            writeFileSync(tempFile, bomBuf);
            try {
                const fileParsed = native.parseNatusFile(tempFile);
                console.log('   parseNatusFile success: channels =', fileParsed.channels.length);
                assert.strictEqual(fileParsed.channels.length, 1);
                assert.strictEqual(fileParsed.channels[0].samples.length, 6);
                console.log('--- ALL NATIVE TESTS PASSED! ---');
            } finally {
                unlinkSync(tempFile);
            }
        });
    });
});

